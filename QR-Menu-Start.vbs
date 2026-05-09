Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Kill old processes on ports 3000 and 3001
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %a /F >nul 2>&1", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %a /F >nul 2>&1", 0, True

' Start backend (hidden window)
WshShell.Run "cmd /c cd /d """ & scriptDir & "\backend"" && npm run dev", 0, False

' Wait for backend to start
WScript.Sleep 3000

' Start frontend (hidden window)
WshShell.Run "cmd /c cd /d """ & scriptDir & "\frontend"" && npm run dev", 0, False

' Wait for frontend to start
WScript.Sleep 5000

' Get local IP address
Set objExec = WshShell.Exec("cmd /c ipconfig | findstr /C:""IPv4""")
strOutput = objExec.StdOut.ReadAll()
arrLines = Split(strOutput, vbCrLf)
localIP = "localhost"
For Each line In arrLines
    If InStr(line, ":") > 0 Then
        parts = Split(line, ":")
        ip = Trim(parts(UBound(parts)))
        If ip <> "" And ip <> "127.0.0.1" Then
            localIP = ip
            Exit For
        End If
    End If
Next

' Open Chrome with the admin page (no terminal window)
menuUrl = "http://" & localIP & ":3000/admin/dashboard"

' Try common Chrome paths
chromePaths = Array( _
    """C:\Program Files\Google\Chrome\Application\chrome.exe""", _
    """C:\Program Files (x86)\Google\Chrome\Application\chrome.exe""", _
    "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" _
)

launched = False
For Each chromePath In chromePaths
    expandedPath = WshShell.ExpandEnvironmentStrings(chromePath)
    cleanPath = Replace(Replace(expandedPath, """", ""), Chr(34), "")
    If fso.FileExists(cleanPath) Then
        WshShell.Run chromePath & " --new-window " & menuUrl, 1, False
        launched = True
        Exit For
    End If
Next

' Fallback: open in default browser
If Not launched Then
    WshShell.Run menuUrl, 1, False
End If
