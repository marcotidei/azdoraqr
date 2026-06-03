# azdòra QR
azdòra QR is a web application designed to configure GoPro cameras running GoPro Labs firmware without requiring knowledge of the underlying command language.
It provides a simple interface to generate valid QR codes that translate directly into GoPro Labs commands, making advanced camera automation accessible and reliable.

### Overview
GoPro Labs enables powerful automation and customization through a compact and expressive command system. However, writing these commands manually can be complex and error-prone.
azdòra QR removes that complexity by allowing users to configure behavior visually while the application handles command generation in the background.

### What It Solves
Eliminates the need to learn GoPro Labs syntax
Reduces errors when building scripts manually
Makes repeatable camera setups easy to configure
Provides an immediate QR output ready for scanning

### Scheduling
The application includes a scheduling system to automate camera behavior over time.
Users can configure:
Active days of the week
Start and end times
Capture interval
Automatic GoPro Cloud upload after capture
The schedule is converted into a valid GoPro Labs script and stored in a format that can be executed directly by the camera.

## How To Use It
1. Reset the GoPro to facrory and clear previous metadata stored in the camera for a clean start.
2. Configure the camera via Quick app and disable Auto Upload in cloud settings if planning to use GoPro cloud.
3. Scan the BOOT scrip keeping default settimgs if unsure.
4. Configure you schedule and make sure you have a formatted SD card installed before scan the SCHEDULE script (NOTE: the achedule script is store in the SD, if uou for at it you need to scan the SCHEDULE again).
5. Reboot the camera to run the script.

## Notes
Commands are generated according to GoPro Labs syntax
Execution behavior depends on camera model and firmware
Scheduling scripts are stored and executed by the camera

### Reference
GoPro Labs documentation: https://gopro.github.io/labs/control/tech/

### License
This project is provided as-is without warranty.
