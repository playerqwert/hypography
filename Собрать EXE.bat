@echo off
rem Rebuilds the Windows versions of Hypography:
rem  - Hypography-portable.exe : light single file (Neutralino + WebView2 built into Windows), starts in 1-2 s
rem  - Hypography-setup.exe    : installer (Electron)
rem The installer is built in a short temp folder: the NSIS tool fails on paths longer than 260 chars.
set "ROOT=%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"

echo Checking JavaScript...
for %%F in ("%ROOT%js\*.js") do (
  node --check "%%F" || goto fail
)

echo Building portable (Neutralino)...
cd /d "%ROOT%portable"
if not exist "%ROOT%portable\node_modules" call npm install --no-audit --no-fund --loglevel=error || goto fail
if not exist "%ROOT%portable\bin\neutralino-win_x64.exe" (
  call npx neu update || goto fail
  node -e "require('rcedit')('bin/neutralino-win_x64.exe',{icon:'../desktop/build/icon.ico','version-string':{ProductName:'Hypography',FileDescription:'Hypography'}}).catch(e=>{console.error(e);process.exit(1)})" || goto fail
)
python "%ROOT%portable\prepare.py" || goto fail
call npx neu build --embed-resources || goto fail
copy /y "%ROOT%portable\dist\Hypography\Hypography-win_x64.exe" "%ROOT%Hypography-portable.exe" >nul || goto busy
rmdir /s /q "%ROOT%portable\dist"

echo Building installer (Electron)...
set "SRC=%ROOT%desktop"
set "B=%TEMP%\hypography-build"
python "%SRC%\prepare.py" || goto fail
robocopy "%SRC%" "%B%" /MIR /XD dist node_modules /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fail
cd /d "%B%"
call npm install --no-audit --no-fund --loglevel=error || goto fail
call npx electron-builder --win nsis || goto fail
copy /y "%B%\dist\Hypography-setup.exe" "%ROOT%Hypography-setup.exe" >nul || goto busy

echo.
echo Done: Hypography-portable.exe and Hypography-setup.exe are next to this file.
pause
goto :eof

:busy
echo.
echo The old exe is open right now. Close Hypography and run this file again.
pause
goto :eof

:fail
echo.
echo Build failed - see the messages above.
pause
