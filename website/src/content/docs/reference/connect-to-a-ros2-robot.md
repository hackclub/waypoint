---
title: Connect Your Computer to a ROS 2 Robot
description: Put your development computer and Raspberry Pi on the same ROS 2 graph.
---

Use this after the Raspberry Pi is running and both machines are on the same Wi-Fi network. ROS 2 nodes discover one another through DDS, so both sides need matching network settings.

## 1. Match the Domain

Choose one `ROS_DOMAIN_ID` between 0 and 101 for your robot. Use the same number in the robot's SSH terminal and the computer's Ubuntu terminal. Do not use a value someone else is using nearby.

In both terminals:

```bash title="Ubuntu terminal"
export ROS_DOMAIN_ID=<your_number>
export ROS_LOCALHOST_ONLY=0
```

Source ROS and your workspace in each terminal before using ROS commands. A topic published under one domain is invisible to a terminal in another domain.

## 2. Make WSL Networking Capable of Discovery

If your computer runs Windows 11 with WSL, enable mirrored networking before testing ROS discovery. In the Windows file `%USERPROFILE%\.wslconfig`, add:

```ini title=".wslconfig"
[wsl2]
networkingMode=mirrored
```

Then close all WSL terminals and run this in PowerShell:

```powershell title="Windows PowerShell"
wsl --shutdown
```

Open Ubuntu WSL again. Microsoft documents mirrored mode because it adds multicast support and lets WSL participate directly on the local network: [WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking).

Linux computers can skip this step. macOS users should perform the test from the Ubuntu virtual machine or remote Ubuntu computer used for the rest of this guide.

## 3. Test Before Starting the Whole Robot

On the Raspberry Pi, publish a test message:

```bash title="Raspberry Pi terminal"
source /opt/ros/jazzy/setup.bash
export ROS_DOMAIN_ID=<your_number>
export ROS_LOCALHOST_ONLY=0
ros2 topic pub /network_test std_msgs/msg/String "{data: hello}" -r 1
```

On the computer, listen for it:

```bash title="Computer Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
export ROS_DOMAIN_ID=<your_number>
export ROS_LOCALHOST_ONLY=0
ros2 topic echo /network_test
```

Only move on once `hello` arrives. It is much easier to diagnose networking with one tiny topic than while motors, IMU, RViz, and teleop are all running.

## If Discovery Still Fails

First check that both machines are on the same non-guest Wi-Fi, that the domain numbers match, and that neither terminal has `ROS_LOCALHOST_ONLY=1` set. Then use the same middleware implementation on both computers:

```bash title="Ubuntu terminal on both machines"
sudo apt update
sudo apt install -y ros-jazzy-rmw-cyclonedds-cpp
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp
```

Restart the test after setting it on both sides. ROS 2 supports multiple middleware implementations, and the [`RMW_IMPLEMENTATION` setting](https://docs.ros.org/en/jazzy/Installation/RMW-Implementations.html) selects the one a terminal uses.

If a restrictive network still blocks multicast, configure Cyclone DDS with an explicit peer address for the Raspberry Pi instead of guessing. Cyclone's [peer configuration reference](https://cyclonedds.io/docs/cyclonedds/latest/config/config_file_reference.html) documents the XML settings. Record the Pi's IP address in your project notes, and keep this network fix separate from your motor and IMU code.
