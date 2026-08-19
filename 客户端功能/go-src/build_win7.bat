@echo off
setlocal
chcp 65001 >nul

rem Win7 builds must use Go 1.20.x. Set GO120_BIN to the full path
rem of go.exe, for example: C:\Go120\bin\go.exe
if not defined GO120_BIN set "GO120_BIN=C:\Go120\bin\go.exe"

if not exist "%GO120_BIN%" (
    echo [ERROR] Go 1.20 toolchain not found: %GO120_BIN%
    echo Set GO120_BIN to the full path of Go 1.20.x go.exe.
    exit /b 1
)

for /f "tokens=3" %%V in ('"%GO120_BIN%" version') do set "GO_VERSION=%%V"
echo %GO_VERSION% | findstr /b /c:"go1.20." >nul
if errorlevel 1 (
    echo [ERROR] Win7 build requires Go 1.20.x, found %GO_VERSION%
    exit /b 1
)

set "GOOS=windows"
set "GOARCH=386"
rem softfloat also supports very old 32-bit CPUs that do not provide SSE2.
set "GO386=softfloat"
set "CGO_ENABLED=0"
set "GOTOOLCHAIN=local"

echo Running tests with %GO_VERSION%...
"%GO120_BIN%" test ./...
if errorlevel 1 exit /b 1

echo Building Win7 x86 console executable...
"%GO120_BIN%" build -trimpath -ldflags="-s -w" -o Listenmain_win7_x86.exe .
if errorlevel 1 exit /b 1

echo Building Win7 x86 GUI executable...
"%GO120_BIN%" build -trimpath -ldflags="-s -w -H windowsgui" -o Listenmain_win7_x86_gui.exe .
if errorlevel 1 exit /b 1

echo Win7 x86 builds completed successfully.
endlocal
