use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use serde::Serialize;
use tauri::{Emitter, Manager, WindowEvent};

static OVERLAY_VISIBLE: AtomicBool = AtomicBool::new(true);
static OVERLAY_LOCKED: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
struct FileStat {
    size: u64,
    modified: u64,
}

#[tauri::command]
fn overlay_set_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    OVERLAY_VISIBLE.store(visible, Ordering::Relaxed);
    apply_overlay_visible(&app, visible)
}

#[tauri::command]
fn overlay_set_click_through(app: tauri::AppHandle, locked: bool) -> Result<(), String> {
    OVERLAY_LOCKED.store(locked, Ordering::Relaxed);
    apply_overlay_lock(&app, locked)
}

#[tauri::command]
fn read_text_path(path: String) -> Result<String, String> {
    let mut text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    const MAX: usize = 2_000_000;
    if text.len() > MAX {
        text = text[text.len() - MAX..].to_string();
    }
    Ok(text)
}

#[tauri::command]
fn stat_text_path(path: String) -> Result<FileStat, String> {
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let modified = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    Ok(FileStat {
        size: meta.len(),
        modified,
    })
}

fn overlay_window(app: &tauri::AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "overlay window missing".into())
}

fn apply_overlay_visible(app: &tauri::AppHandle, visible: bool) -> Result<(), String> {
    let overlay = overlay_window(app)?;
    if visible {
        overlay.show().map_err(|e| e.to_string())?;
        let _ = overlay.unminimize();
        let _ = overlay.set_always_on_top(true);
        #[cfg(windows)]
        win_overlay::show_no_activate(&overlay);
    } else {
        overlay.hide().map_err(|e| e.to_string())?;
    }
    let _ = app.emit("eqlsky://overlay-visible", visible);
    Ok(())
}

fn apply_overlay_lock(app: &tauri::AppHandle, locked: bool) -> Result<(), String> {
    let overlay = overlay_window(app)?;
    overlay
        .set_ignore_cursor_events(locked)
        .map_err(|e| e.to_string())?;
    let _ = app.emit("eqlsky://overlay-locked", locked);
    Ok(())
}

fn prevent_destroy(win: &tauri::WebviewWindow) {
    let hide = win.clone();
    let app = win.app_handle().clone();
    let label = win.label().to_string();
    win.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = hide.hide();
            if label == "overlay" {
                OVERLAY_VISIBLE.store(false, Ordering::Relaxed);
                let _ = app.emit("eqlsky://overlay-visible", false);
            }
        }
    });
}

fn spawn_overlay_keeper(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        #[cfg(windows)]
        win_overlay::register_hotkeys();

        loop {
            if let Some(overlay) = app.get_webview_window("overlay") {
                if OVERLAY_VISIBLE.load(Ordering::Relaxed) {
                    let _ = overlay.set_always_on_top(true);
                    #[cfg(windows)]
                    win_overlay::keep_topmost(&overlay);
                }
            }

            #[cfg(windows)]
            for action in win_overlay::drain_hotkeys() {
                match action {
                    win_overlay::Hotkey::ToggleOverlay => {
                        let next = !OVERLAY_VISIBLE.load(Ordering::Relaxed);
                        OVERLAY_VISIBLE.store(next, Ordering::Relaxed);
                        let _ = apply_overlay_visible(&app, next);
                    }
                    win_overlay::Hotkey::ToggleLock => {
                        let next = !OVERLAY_LOCKED.load(Ordering::Relaxed);
                        OVERLAY_LOCKED.store(next, Ordering::Relaxed);
                        let _ = apply_overlay_lock(&app, next);
                    }
                    win_overlay::Hotkey::ShowMenu => {
                        if let Some(menu) = app.get_webview_window("menu") {
                            let _ = menu.show();
                            let _ = menu.unminimize();
                            let _ = menu.set_focus();
                        }
                    }
                }
            }

            std::thread::sleep(Duration::from_millis(400));
        }
    });
}

#[cfg(windows)]
mod win_overlay {
    use std::ffi::c_void;
    use std::ptr::null_mut;
    use tauri::WebviewWindow;

    pub enum Hotkey {
        ToggleOverlay,
        ToggleLock,
        ShowMenu,
    }

    const HWND_TOPMOST: isize = -1;
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_NOACTIVATE: u32 = 0x0010;
    const SW_SHOWNOACTIVATE: i32 = 4;
    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_TOPMOST: isize = 0x00000008;
    const WS_EX_TOOLWINDOW: isize = 0x00000080;
    const WM_HOTKEY: u32 = 0x0312;
    const MOD_CONTROL: u32 = 0x0002;
    const MOD_SHIFT: u32 = 0x0004;
    const MOD_NOREPEAT: u32 = 0x4000;
    const PM_REMOVE: u32 = 0x0001;
    const VK_O: u32 = 0x4F;
    const VK_L: u32 = 0x4C;
    const VK_M: u32 = 0x4D;

    #[repr(C)]
    struct Point {
        x: i32,
        y: i32,
    }

    #[repr(C)]
    struct Msg {
        hwnd: *mut c_void,
        message: u32,
        _pad: u32,
        wparam: usize,
        lparam: isize,
        time: u32,
        pt: Point,
    }

    #[link(name = "user32")]
    extern "system" {
        fn SetWindowPos(
            hwnd: *mut c_void,
            after: *mut c_void,
            x: i32,
            y: i32,
            cx: i32,
            cy: i32,
            flags: u32,
        ) -> i32;
        fn ShowWindow(hwnd: *mut c_void, cmd: i32) -> i32;
        fn GetWindowLongPtrW(hwnd: *mut c_void, index: i32) -> isize;
        fn SetWindowLongPtrW(hwnd: *mut c_void, index: i32, new_long: isize) -> isize;
        fn RegisterHotKey(hwnd: *mut c_void, id: i32, mods: u32, vk: u32) -> i32;
        fn PeekMessageW(
            msg: *mut Msg,
            hwnd: *mut c_void,
            min: u32,
            max: u32,
            remove: u32,
        ) -> i32;
        fn TranslateMessage(msg: *const Msg) -> i32;
        fn DispatchMessageW(msg: *const Msg) -> isize;
    }

    fn raw_hwnd(win: &WebviewWindow) -> Option<*mut c_void> {
        win.hwnd().ok().map(|handle| {
            let bits: isize = unsafe { std::mem::transmute_copy(&handle) };
            bits as *mut c_void
        })
    }

    pub fn keep_topmost(win: &WebviewWindow) {
        let Some(hwnd) = raw_hwnd(win) else { return };
        unsafe {
            let mut ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            ex |= WS_EX_TOPMOST | WS_EX_TOOLWINDOW;
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex);
            SetWindowPos(
                hwnd,
                HWND_TOPMOST as *mut c_void,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            );
        }
    }

    pub fn show_no_activate(win: &WebviewWindow) {
        let Some(hwnd) = raw_hwnd(win) else { return };
        unsafe {
            ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
        keep_topmost(win);
    }

    pub fn register_hotkeys() {
        unsafe {
            RegisterHotKey(null_mut(), 1, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_O);
            RegisterHotKey(null_mut(), 2, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_L);
            RegisterHotKey(null_mut(), 3, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_M);
        }
    }

    pub fn drain_hotkeys() -> Vec<Hotkey> {
        let mut out = Vec::new();
        unsafe {
            let mut msg: Msg = std::mem::zeroed();
            while PeekMessageW(&mut msg, null_mut(), 0, 0, PM_REMOVE) != 0 {
                if msg.message == WM_HOTKEY {
                    match msg.wparam {
                        1 => out.push(Hotkey::ToggleOverlay),
                        2 => out.push(Hotkey::ToggleLock),
                        3 => out.push(Hotkey::ShowMenu),
                        _ => {}
                    }
                } else {
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }
            }
        }
        out
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            overlay_set_visible,
            overlay_set_click_through,
            read_text_path,
            stat_text_path
        ])
        .setup(|app| {
            if let Some(menu) = app.get_webview_window("menu") {
                prevent_destroy(&menu);
            }
            if let Some(overlay) = app.get_webview_window("overlay") {
                prevent_destroy(&overlay);
                let _ = overlay.set_ignore_cursor_events(false);
                let _ = overlay.set_always_on_top(true);
                let _ = overlay.show();
                #[cfg(windows)]
                win_overlay::show_no_activate(&overlay);
            }
            spawn_overlay_keeper(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running eqlSky");
}
