@echo off
rem Rebuilds the Android app: copies the web app, syncs Capacitor, builds a debug APK.
set "ROOT=%~dp0"
set "APP=%ROOT%android-app"
set "PATH=C:\Program Files\nodejs;%PATH%"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
for /f "tokens=2 delims==" %%J in ('java -XshowSettings:properties -version 2^>^&1 ^| findstr "java.home"') do set "JAVA_HOME=%%J"
set "JAVA_HOME=%JAVA_HOME:~1%"
for %%F in ("%ROOT%js\*.js") do (
  node --check "%%F" || goto fail
)
cd /d "%APP%"
python "%APP%\prepare.py" || goto fail
call npx cap sync android || goto fail
cd /d "%APP%\android"
call "%APP%\android\gradlew.bat" assembleDebug || goto fail
copy /y "%APP%\android\app\build\outputs\apk\debug\app-debug.apk" "%ROOT%Hypography.apk" >nul
echo.
echo Done: Hypography.apk is next to this file. Send it to the phone and install.
pause
goto :eof

:fail
echo.
echo Build failed - see the messages above.
pause
