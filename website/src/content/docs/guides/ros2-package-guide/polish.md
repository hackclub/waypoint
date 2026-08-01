---
title: Polish Your Package
description: Make the package easy to understand and enjoyable to use before you submit it.
---

Your required package is complete when it has movement, open-loop odometry, the IMU node, teleop compatibility, and your autonomous routine. This page is for the choices that make the project clearer and more polished without turning it into a different project.

## Make the Repository Readable

A reviewer should be able to open the repository and quickly find:

- your ROS package source
- `config/` values for motor channels, limits, IMU settings, and dead-reckoning scales
- `launch/` files for normal bringup and your autonomous routine
- a README explaining what the robot does, its package layout, and how the nodes connect
- the chassis CAD and PCB files required by the rest of Waypoint

A small topic diagram in the README is useful. For example, show teleop and autonomy feeding `/cmd_vel`, then motor driver and odometry subscribing to it, with the IMU publishing separately.

## Improve the Driving Experience

Use descriptive parameter names, keep an obvious maximum output limit, and document your dead-reckoning assumptions. The optional [event-based keyboard teleop](/reference/keyboard-teleop/) is a good extra if you want press/release driving instead of standard terminal key repeat.

## Add a Robot Model in RViz

An STL of your own chassis makes a future RViz view much nicer. Keep the STEP or native CAD assembly as source, export an STL for display, and use one `base_link` visual rather than a pretend box robot. The [Robot Models in RViz](/reference/robot-models-in-rviz/) reference covers the small URDF and package-install pieces when you are ready.

This is optional polish. The robot does not need an animated wheel model or a joint-state publisher for parts you are not controlling.

## Write Down the Decisions

Add a short design note to your README covering:

- your motor driver and how the left/right motor requests are mixed
- why your output limit and watchdog values make sense
- the IMU's orientation in the chassis and the frame you publish
- how open-loop dead reckoning works on the encoder-free kit
- what your autonomous routine does and why you chose it

Those notes are proof that the package is your work and make the later robot bringup much smoother.

## Submission Check

Before you submit, confirm that your repository contains source code you can explain for all of these:

| Required part | What should be in your package |
| --- | --- |
| Motor control | `/cmd_vel` subscription, motor-driver logic, limits, watchdog, configuration |
| Dead reckoning | `/cmd_vel` integration, `/odom`, `/path`, TF, scale configuration |
| IMU | I2C reader, unit conversion, `/imu/data_raw`, sensor configuration |
| Teleop | standard `/cmd_vel` compatibility; optional event-based teleop is fine |
| Autonomous behavior | a node that publishes your own timed `Twist` sequence and stops safely |
| Bringup | launch/config files that show how the nodes fit together |

After your kit arrives, use [Put Your Package on a Robot](/guides/robot-bringup/) and [Verify Your Robot Data](/reference/verify-your-robot/) to bring this source package to real hardware.
