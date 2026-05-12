@echo off
REM Windows installer entrypoint.
REM Delegates to existing shared batch installer implementation.

setlocal
set "SCRIPT_DIR=%~dp0"

call "%SCRIPT_DIR%install.bat" %*
exit /b %ERRORLEVEL%
