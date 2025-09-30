Seguridad: manejo de la clave de servicio de Firebase

- No mantengas el archivo de credenciales dentro del repositorio.
- Mueve el archivo JSON de la cuenta de servicio fuera del repo. Por ejemplo:

  C:\users\ESTUDIANTE\secrets\timeac-2025-firebase-adminsdk.json

- Añade la ruta al archivo en la variable de entorno `GOOGLE_APPLICATION_CREDENTIALS` antes de ejecutar scripts que usan `firebase-admin`.

Ejemplo en PowerShell:

  $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\users\ESTUDIANTE\secrets\timeac-2025-firebase-adminsdk.json'
  npm run import-jornadas

He movido la clave a: `C:\Users\ESTUDIANTE\Documents\TimeAC-credentials\timeac-2025-firebase-adminsdk-fbsvc-89fbfb3e9a.json`.

Para ejecutar el script de importación real desde este repositorio en PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\Users\ESTUDIANTE\Documents\TimeAC-credentials\timeac-2025-firebase-adminsdk-fbsvc-89fbfb3e9a.json'
npm run import-jornadas
```

Nota: borra la copia en el repo si no la quieres allí y confirma que `.gitignore` contiene la entrada para evitar commitearla.
