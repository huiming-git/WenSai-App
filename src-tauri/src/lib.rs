use serde::Serialize;
use std::{fs, path::Path};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct DroppedFilePayload {
    filename: String,
    path: String,
    bytes: Vec<u8>,
}

#[derive(Serialize)]
struct CachedPreviewFilePayload {
    path: String,
}

#[tauri::command]
fn read_dropped_files(paths: Vec<String>) -> Result<Vec<DroppedFilePayload>, String> {
    paths
        .into_iter()
        .map(|path| {
            let bytes = fs::read(&path).map_err(|err| format!("读取文件失败：{}：{}", path, err))?;
            let filename = Path::new(&path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("upload.bin")
                .to_string();

            Ok(DroppedFilePayload {
                filename,
                path,
                bytes,
            })
        })
        .collect()
}

#[tauri::command]
fn cache_local_preview_file(
    app: AppHandle,
    task_id: i64,
    file_id: i64,
    filename: String,
    bytes: Vec<u8>,
) -> Result<CachedPreviewFilePayload, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("获取本地缓存目录失败：{}", err))?;
    let safe_filename = safe_relative_path(&filename);
    let target = app_data_dir
        .join("local-files")
        .join(format!("task-{}", task_id))
        .join(format!("file-{}", file_id))
        .join(safe_filename);

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建本地缓存目录失败：{}", err))?;
    }
    fs::write(&target, bytes).map_err(|err| format!("写入本地缓存文件失败：{}", err))?;

    Ok(CachedPreviewFilePayload {
        path: target.to_string_lossy().to_string(),
    })
}

fn safe_relative_path(value: &str) -> std::path::PathBuf {
    let parts = value
        .replace('\\', "/")
        .split('/')
        .filter(|part| !part.is_empty() && *part != "." && *part != "..")
        .map(safe_path_segment)
        .collect::<Vec<_>>();

    if parts.is_empty() {
        return std::path::PathBuf::from("download.bin");
    }

    parts.iter().collect()
}

fn safe_path_segment(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_' | ' ') {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches([' ', '.', '-'])
        .to_string();

    if sanitized.is_empty() {
        "file".to_string()
    } else {
        sanitized
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_dropped_files, cache_local_preview_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
