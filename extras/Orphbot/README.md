# OrphBot

Orphbot is a 4 wheeled robot with a small lifter on its front. It runs ROS 2 and has a couple autonomous routines.

It serves as an example for the [Waypoint YSWS](https://www.waypoint.hackclub.com), since it implements every component that comes in the kit.

## Renders
*These are optional for submission, but make your design look way cooler!*

![Orphbot Front](./Renders/Orphbot%20Front.png)
![Orphbot Top](./Renders/Orphbot%20Top.png)
![Orphbot Side](./Renders/Orphbot%20Side.png)
![Orphbot Back](./Renders/Orphbot%20Back.png)

## Features:

* A dual color top design
* 128x64 OLED Display
* A 9v Battery
* 6 SK6812 MINI E LEDs
* 4 Drive Motors
* An MPU6050

## CAD:

Everything fits together using 8 M3 Bolts and heatset inserts. Two for the PCB and six for the case.

It has 5 separate 3D printed parts. The main chassis is made up of the lower unibody and top plate, but the design also includes a separate battery cover for easier access as well as a button cover and forks to attach a servo.

![OrphBot CAD](./Renders/Orphbot%20CAD.png)

## PCB:

Heres what the PCB looks like! It was made in KiCAD.

![OrphBot Side View](./PCB/renders/Orphbot%20PCB%20Side.png)
![OrphBot Side View](./PCB/renders/Orphbot%20PCB%20Top.png)
![OrphBot Side View](./PCB/renders/Orphbot%20PCB%20Bottom.png)
![OrphBot Side View](./PCB/renders/PCB.png)
![OrphBot Side View](./PCB/renders/Schematic.png)

## Firmware:

This robot uses ROS2! Its package lives in the linked [Firmware](Firmware/) folder, which points to [SharKingStudios/orphbot-package](https://github.com/SharKingStudios/orphbot-package).

* It can connect and display its information to RViz
* It connects to an Xbox controller for control
* The robot can run some simple preprogrammed automous missions
* The OLED displays a small fluid simulation!

## BOM:

The BOM is not included yet.

## Extra stuff

Put something fun or interesting here! Inspiration for the project? Your favorite meme? A joke? Up to you.