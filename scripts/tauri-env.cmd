@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%\..\.rustup") do set "RUSTUP_HOME=%%~fI"
set "RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-msvc"

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\cargo.exe" set "PATH=%PATH%;%CARGO_BIN%"

if "%~1"=="dev" (
  tauri dev
) else if "%~1"=="build" (
  tauri build
) else (
  tauri %*
)
