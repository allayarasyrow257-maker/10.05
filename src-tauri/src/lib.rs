use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct ServerProcesses {
    backend: Option<Child>,
    frontend: Option<Child>,
}

impl Drop for ServerProcesses {
    fn drop(&mut self) {
        if let Some(ref mut child) = self.backend {
            let _ = child.kill();
        }
        if let Some(ref mut child) = self.frontend {
            let _ = child.kill();
        }
    }
}

fn get_app_dir() -> std::path::PathBuf {
    let exe_path = std::env::current_exe().expect("Failed to get executable path");
    let exe_dir = exe_path.parent().expect("Failed to get exe directory");

    if cfg!(target_os = "macos") {
        exe_dir
            .parent()
            .map(|p| p.join("Resources"))
            .unwrap_or_else(|| exe_dir.to_path_buf())
    } else {
        exe_dir.to_path_buf()
    }
}

fn find_node() -> String {
    if Command::new("node").arg("--version").output().is_ok() {
        return "node".to_string();
    }

    if cfg!(target_os = "windows") {
        for path in &[
            r"C:\Program Files\nodejs\node.exe",
            r"C:\Program Files (x86)\nodejs\node.exe",
        ] {
            if std::path::Path::new(path).exists() {
                return path.to_string();
            }
        }
    } else {
        for path in &["/usr/local/bin/node", "/opt/homebrew/bin/node"] {
            if std::path::Path::new(path).exists() {
                return path.to_string();
            }
        }
        if let Ok(home) = std::env::var("HOME") {
            let nvm_dir = format!("{}/.nvm/versions/node", home);
            if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
                let mut versions: Vec<_> = entries.filter_map(|e| e.ok()).collect();
                versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
                if let Some(latest) = versions.first() {
                    let node_path = latest.path().join("bin/node");
                    if node_path.exists() {
                        return node_path.to_string_lossy().to_string();
                    }
                }
            }
        }
    }
    "node".to_string()
}

fn wait_for_port(port: u16, timeout_secs: u64) -> bool {
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(timeout_secs);
    let addr = format!("127.0.0.1:{}", port);

    while start.elapsed() < timeout {
        if TcpStream::connect(&addr).is_ok() {
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    false
}

fn start_production_servers(app_dir: &std::path::Path) -> ServerProcesses {
    let node = find_node();
    let backend_dir = app_dir.join("backend");
    let frontend_dir = app_dir.join("frontend");

    log::info!("App directory: {:?}", app_dir);
    log::info!("Node path: {}", node);

    let node_path = std::path::Path::new(&node);
    let node_bin_dir = if node_path.is_absolute() {
        node_path.parent().map(|p| p.to_path_buf())
    } else {
        None
    };

    let current_path = std::env::var("PATH").unwrap_or_default();
    let path_sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let new_path = if let Some(ref bin_dir) = node_bin_dir {
        format!("{}{}{}", bin_dir.display(), path_sep, current_path)
    } else {
        current_path
    };

    // Start backend
    let backend = Command::new(&node)
        .arg("src/index.js")
        .current_dir(&backend_dir)
        .env("PORT", "3001")
        .env("NODE_ENV", "production")
        .env("PATH", &new_path)
        .spawn()
        .map_err(|e| log::error!("Failed to start backend: {}", e))
        .ok();

    // Start frontend (Next.js production server)
    let next_bin = if cfg!(target_os = "windows") {
        frontend_dir.join("node_modules").join(".bin").join("next.cmd")
    } else {
        frontend_dir.join("node_modules").join(".bin").join("next")
    };

    let frontend = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &next_bin.to_string_lossy(), "start", "-p", "3000"])
            .current_dir(&frontend_dir)
            .env("NODE_ENV", "production")
            .env("PATH", &new_path)
            .spawn()
            .map_err(|e| log::error!("Failed to start frontend: {}", e))
            .ok()
    } else {
        Command::new(&node)
            .arg(&next_bin)
            .args(["start", "-p", "3000"])
            .current_dir(&frontend_dir)
            .env("NODE_ENV", "production")
            .env("PATH", &new_path)
            .spawn()
            .map_err(|e| log::error!("Failed to start frontend: {}", e))
            .ok()
    };

    log::info!("Production server processes spawned");
    ServerProcesses { backend, frontend }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            // In production, start the servers ourselves
            // In dev, beforeDevCommand handles this
            if !cfg!(debug_assertions) {
                let app_dir = get_app_dir();
                let processes = start_production_servers(&app_dir);
                app.manage(Mutex::new(processes));

                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    log::info!("Waiting for backend on port 3001...");
                    if wait_for_port(3001, 30) {
                        log::info!("Backend is ready!");
                    } else {
                        log::error!("Backend failed to start within 30s");
                    }

                    log::info!("Waiting for frontend on port 3000...");
                    if wait_for_port(3000, 30) {
                        log::info!("Frontend is ready!");
                        std::thread::sleep(std::time::Duration::from_secs(1));
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.eval("window.location.reload()");
                        }
                    } else {
                        log::error!("Frontend failed to start within 30s");
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
