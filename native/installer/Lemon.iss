#ifndef PublishDir
  #error PublishDir must point to a self-contained publish directory
#endif
#ifndef ReleaseVersion
  #define ReleaseVersion "2.2.0"
#endif
[Setup]
AppId={{6F55E856-6D27-49B7-B451-3455B806C580}
AppName=Lemon
AppVersion={#ReleaseVersion}
AppVerName=Lemon {#ReleaseVersion}
AppPublisher=Lemon
AppPublisherURL=https://lemonai.wik-speck.workers.dev/
DefaultDirName={localappdata}\Programs\Lemon
DefaultGroupName=Lemon
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputBaseFilename=Lemon-{#ReleaseVersion}-Setup
OutputDir=..\artifacts\{#ReleaseVersion}
SetupIconFile={#PublishDir}\Assets\lemon.ico
UninstallDisplayIcon={app}\Lemon2.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#ReleaseVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "polish"; MessagesFile: "compiler:Languages\Polish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Excludes: "*.pdb"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Lemon"; Filename: "{app}\Lemon2.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Lemon"; Filename: "{app}\Lemon2.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\Lemon2.exe"; Description: "{cm:LaunchProgram,Lemon}"; Flags: nowait postinstall skipifsilent

; User data in LocalAppData\Lemon2 is deliberately retained on uninstall.
