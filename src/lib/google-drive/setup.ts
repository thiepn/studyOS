import { createAdminClient } from "@/lib/supabase/admin";
import { createFolder, listChildren, type DriveFile } from "./client";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SUBFOLDERS = ["00_COURSE", "01_WEEKS", "90_ALTKLAUSUREN", "91_SCRIPT", "92_REFERENCE", "99_SYSTEM"] as const;
const MAP_KEYS = ["course", "weeks", "exams", "script", "reference", "system"] as const;

function safeFolderName(value:string){
  return value.replaceAll("/","-").replaceAll("\\","-").trim().slice(0,120)||"Semester";
}
function folderNamed(files:DriveFile[],name:string){
  return files.find(file=>file.mimeType===FOLDER_MIME&&file.name===name)??null;
}

export async function createSemesterDriveTree(userId: string, accessToken: string) {
  const admin = createAdminClient();
  const [{ data: semester, error: semesterError }, { data: connection, error: connectionError }] = await Promise.all([
    admin.from("study_semesters")
      .select("id,display_name,drive_root_folder_id,drive_root_folder_url,drive_semester_folder_id,drive_semester_folder_url,drive_inbox_folder_id,drive_inbox_folder_url")
      .eq("user_id", userId).eq("active", true).single(),
    admin.from("study_drive_connections")
      .select("root_folder_id,root_folder_url,status").eq("user_id", userId).single(),
  ]);
  if (semesterError || !semester) throw new Error("An active StudyOS semester is required before Drive setup");
  if (connectionError || !connection || connection.status !== "connected") throw new Error("Google Drive is not connected");

  const { data: courses, error: coursesError } = await admin.from("study_courses")
    .select("id,stable_key,display_name,sort_order,drive_folder_id,drive_folder_url,drive_folder_map")
    .eq("user_id", userId).eq("semester_id", semester.id).eq("active", true).order("sort_order");
  if (coursesError) throw new Error("Could not load study courses");

  let root:{id:string;webViewLink?:string};
  if(connection.root_folder_id){
    root={id:connection.root_folder_id,webViewLink:connection.root_folder_url??undefined};
  }else{
    const topLevel=await listChildren(accessToken,"root");
    root=folderNamed(topLevel,"Semester OS")??await createFolder(accessToken,"Semester OS");
  }

  const semesterName=safeFolderName(semester.display_name);
  let semesterFolder:{id:string;webViewLink?:string};
  if(semester.drive_semester_folder_id){
    semesterFolder={id:semester.drive_semester_folder_id,webViewLink:semester.drive_semester_folder_url??undefined};
  }else{
    const rootChildren=await listChildren(accessToken,root.id);
    semesterFolder=folderNamed(rootChildren,semesterName)??await createFolder(accessToken,semesterName,root.id);
  }

  let semesterChildren=await listChildren(accessToken,semesterFolder.id);
  let inbox:{id:string;webViewLink?:string};
  if(semester.drive_inbox_folder_id){
    inbox={id:semester.drive_inbox_folder_id,webViewLink:semester.drive_inbox_folder_url??undefined};
  }else{
    const existing=folderNamed(semesterChildren,"00_INBOX");
    inbox=existing??await createFolder(accessToken,"00_INBOX",semesterFolder.id);
    if(!existing)semesterChildren=[...semesterChildren,inbox as DriveFile];
  }

  await admin.from("study_semesters").update({
    drive_root_folder_id:root.id,
    drive_root_folder_url:root.webViewLink??`https://drive.google.com/drive/folders/${root.id}`,
    drive_semester_folder_id:semesterFolder.id,
    drive_semester_folder_url:semesterFolder.webViewLink??`https://drive.google.com/drive/folders/${semesterFolder.id}`,
    drive_inbox_folder_id:inbox.id,
    drive_inbox_folder_url:inbox.webViewLink??`https://drive.google.com/drive/folders/${inbox.id}`,
  }).eq("id",semester.id).eq("user_id",userId);

  let createdCourseFolders=0,reusedCourseFolders=0;
  for(const course of courses??[]){
    const existingMap=course.drive_folder_map&&typeof course.drive_folder_map==="object"&&!Array.isArray(course.drive_folder_map)
      ?course.drive_folder_map as Record<string,string>
      :{};
    const courseName=`${String(course.sort_order).padStart(2,"0")}_${safeFolderName(course.display_name)}`;
    let courseFolder:{id:string;webViewLink?:string};
    if(course.drive_folder_id){
      courseFolder={id:course.drive_folder_id,webViewLink:course.drive_folder_url??undefined};
      reusedCourseFolders++;
    }else{
      const existing=folderNamed(semesterChildren,courseName);
      courseFolder=existing??await createFolder(accessToken,courseName,semesterFolder.id);
      if(existing)reusedCourseFolders++;
      else{
        createdCourseFolders++;
        semesterChildren=[...semesterChildren,courseFolder as DriveFile];
      }
    }

    const folderMap:Record<string,string>={...existingMap};
    let courseChildren=await listChildren(accessToken,courseFolder.id);
    for(let i=0;i<SUBFOLDERS.length;i++){
      const key=MAP_KEYS[i];
      if(folderMap[key])continue;
      const name=SUBFOLDERS[i];
      const existing=folderNamed(courseChildren,name);
      const folder=existing??await createFolder(accessToken,name,courseFolder.id);
      folderMap[key]=folder.id;
      if(!existing)courseChildren=[...courseChildren,folder];
    }
    await admin.from("study_courses").update({
      drive_folder_id:courseFolder.id,
      drive_folder_url:courseFolder.webViewLink??`https://drive.google.com/drive/folders/${courseFolder.id}`,
      drive_folder_map:folderMap,
    }).eq("id",course.id).eq("user_id",userId);
  }

  await admin.from("study_drive_connections").update({
    root_folder_id:root.id,
    root_folder_url:root.webViewLink??`https://drive.google.com/drive/folders/${root.id}`,
    semester_folder_id:semesterFolder.id,
    semester_folder_url:semesterFolder.webViewLink??`https://drive.google.com/drive/folders/${semesterFolder.id}`,
    inbox_folder_id:inbox.id,
    inbox_folder_url:inbox.webViewLink??`https://drive.google.com/drive/folders/${inbox.id}`,
    status:"connected",last_error:null,
  }).eq("user_id",userId);

  return {
    root,semesterFolder,inbox,
    reused:Boolean(semester.drive_semester_folder_id),
    createdCourseFolders,reusedCourseFolders,courseCount:(courses??[]).length,
  };
}
