---
title: Set Up Ubuntu for ROS 2
description: Install Ubuntu 24.04 tooling and ROS 2 Jazzy on the computer that will develop your package.
---

Use this reference once, before starting the ROS 2 Package Guide. The commands below are intentionally exact because package installation is not the creative part of this project.

## Choose Your Ubuntu Terminal

**Windows:** Open an administrator PowerShell window and run:

```powershell title="Windows PowerShell"
wsl --install -d Ubuntu-24.04
```

Restart if Windows asks, then launch **Ubuntu 24.04** from the Start menu. Complete the Linux username and password prompt. All later Linux and ROS commands belong in that Ubuntu terminal, not PowerShell.

**Ubuntu Linux:** Open your normal terminal and continue below.

**macOS:** Use an Ubuntu 24.04 virtual machine or a remote Ubuntu 24.04 computer. ROS 2 Jazzy packages in this guide target Ubuntu so the development environment matches the Raspberry Pi.

## Add the ROS 2 Package Source

Run this setup on every Ubuntu machine that will use ROS 2: your computer now, and the Raspberry Pi later.

```bash title="Ubuntu terminal"
sudo apt update
sudo apt install -y locales software-properties-common curl
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

sudo add-apt-repository universe -y
sudo apt update
export ROS_APT_SOURCE_VERSION=$(curl -s https://api.github.com/repos/ros-infrastructure/ros-apt-source/releases/latest | grep -F "tag_name" | awk -F'"' '{print $4}')
curl -L -o /tmp/ros2-apt-source.deb "https://github.com/ros-infrastructure/ros-apt-source/releases/download/${ROS_APT_SOURCE_VERSION}/ros2-apt-source_${ROS_APT_SOURCE_VERSION}.$(. /etc/os-release && echo ${UBUNTU_CODENAME:-${VERSION_CODENAME}})_all.deb"
sudo dpkg -i /tmp/ros2-apt-source.deb
```

## Install the Right ROS 2 Package Set

On the development computer, install the desktop tools and RViz:

```bash title="Development computer Ubuntu terminal"
sudo apt update
sudo apt install -y ros-jazzy-desktop ros-dev-tools
sudo rosdep init
rosdep update
```

`ros-jazzy-desktop` includes RViz and the desktop tools.

On the Raspberry Pi later, install the smaller robot package set instead:

```bash title="Raspberry Pi terminal"
sudo apt update
sudo apt install -y ros-jazzy-ros-base ros-dev-tools
sudo rosdep init
rosdep update
```

The Pi does not need to render RViz, so `ros-jazzy-ros-base` leaves more of its limited memory and storage for the robot. The official [Ubuntu deb installation instructions](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html) are the source of truth if a command changes in a future release.
## Verify It Works

Every fresh terminal needs the ROS environment loaded:

```bash title="Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
ros2 run demo_nodes_cpp talker
```

Leave that running. Open a second Ubuntu terminal, source ROS again, and run:

```bash title="Ubuntu terminal 2"
source /opt/ros/jazzy/setup.bash
ros2 run demo_nodes_py listener
```

The listener should report messages from the talker. Stop both with `Ctrl+C`.

:::caution[Keep Python simple]
Use Ubuntu's system Python for this project. Conda and unrelated virtual environments can use a different Python than ROS 2's binary packages, which makes imports fail in very confusing ways.
:::

