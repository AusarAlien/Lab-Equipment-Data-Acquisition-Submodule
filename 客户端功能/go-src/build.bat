@echo off
chcp 65001 >nul
echo ==========================================
echo   Go 仪器监听程序 — 一键编译
echo ==========================================
echo.

set GOOS=windows
set CGO_ENABLED=0

:menu
echo 选择编译目标:
echo   [1] 32-bit (Win7/XP 兼容)  调试版（带控制台）
echo   [2] 32-bit (Win7/XP 兼容)  发布版（无控制台）
echo   [3] 64-bit  调试版（带控制台）
echo   [4] 64-bit  发布版（无控制台）
echo   [5] 全部编译
echo   [0] 退出
echo.
set /p choice=请输入数字 (0-5):

if "%choice%"=="1" goto build32
if "%choice%"=="2" goto build32gui
if "%choice%"=="3" goto build64
if "%choice%"=="4" goto build64gui
if "%choice%"=="5" goto buildall
if "%choice%"=="0" exit /b 0
goto menu

:build32
echo.
echo [*] 编译 32-bit 调试版...
set GOARCH=386
go build -ldflags="-s -w" -o dist\Listenmain_32.exe .
echo [√] dist\Listenmain_32.exe (32-bit, 带控制台)
goto done

:build32gui
echo.
echo [*] 编译 32-bit 发布版...
set GOARCH=386
go build -ldflags="-s -w -H windowsgui" -o dist\Listenmain_32_noconsole.exe .
echo [√] dist\Listenmain_32_noconsole.exe (32-bit, 无控制台)
goto done

:build64
echo.
echo [*] 编译 64-bit 调试版...
set GOARCH=amd64
go build -ldflags="-s -w" -o dist\Listenmain_64.exe .
echo [√] dist\Listenmain_64.exe (64-bit, 带控制台)
goto done

:build64gui
echo.
echo [*] 编译 64-bit 发布版...
set GOARCH=amd64
go build -ldflags="-s -w -H windowsgui" -o dist\Listenmain_64_noconsole.exe .
echo [√] dist\Listenmain_64_noconsole.exe (64-bit, 无控制台)
goto done

:buildall
echo.
echo [*] 编译全部版本...
if not exist dist mkdir dist
echo   32-bit 调试版...
set GOARCH=386
go build -ldflags="-s -w" -o dist\Listenmain_32.exe .
echo   32-bit 发布版...
go build -ldflags="-s -w -H windowsgui" -o dist\Listenmain_32_noconsole.exe .
echo   64-bit 调试版...
set GOARCH=amd64
go build -ldflags="-s -w" -o dist\Listenmain_64.exe .
echo   64-bit 发布版...
go build -ldflags="-s -w -H windowsgui" -o dist\Listenmain_64_noconsole.exe .
echo [√] 全部编译完成 → dist\
goto done

:done
echo.
pause