Set UAC = CreateObject("Shell.Application")
UAC.ShellExecute "powershell.exe", "-NoProfile -ExecutionPolicy Bypass -File ""C:\Users\sophi\Downloads\Turafood\fix-turafood-dns.ps1""", "", "runas", 1
