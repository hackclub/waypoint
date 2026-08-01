---
title: Learn the ROS 2 Basics
description: Run the official ROS 2 examples and learn the commands this guide uses later.
---

This page is the computer-only warmup. You are not writing your package yet. First you need to learn the ROS 2 words and commands that will make the following pages make sense.

Open the official tutorials when they are linked, but use this page as your route through them. You can ignore services, actions, custom interfaces, and simulation for now.

## Checkpoint A: Source ROS

Open the official [Configure the ROS 2 environment tutorial](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Configuring-ROS2-Environment.html). Read the parts about sourcing `setup.bash` and environment variables. You do not need to edit `.bashrc` yet unless you want every new terminal to load ROS automatically.

Run this in an Ubuntu terminal:

```bash title="Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
printenv ROS_DISTRO
which ros2
ros2 --help
```

Expected result:

- `printenv ROS_DISTRO` prints `jazzy`
- `which ros2` prints a path ending in `ros2`
- `ros2 --help` shows command groups such as `node`, `topic`, `interface`, and `run`

`source` changes the current shell. It does not install new files, and it does not affect terminals that are already open somewhere else. `/opt/ros/jazzy/setup.bash` is the ROS 2 Jazzy underlay: the installed ROS system your future workspace will build on top of.

## Checkpoint B: Run Two Nodes

A node is a running program. A Python file on disk is not a node until a process is actually running.

Open the official [Understanding ROS 2 nodes tutorial](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Nodes/Understanding-ROS2-Nodes.html). Focus on `ros2 run`, `ros2 node list`, and `ros2 node info`. You can skim remapping for now.

In one terminal, run the talker:

```bash title="Ubuntu terminal 1"
source /opt/ros/jazzy/setup.bash
ros2 run demo_nodes_cpp talker
```

Leave it running. In a second terminal, run the listener:

```bash title="Ubuntu terminal 2"
source /opt/ros/jazzy/setup.bash
ros2 run demo_nodes_py listener
```

In a third terminal, inspect the running graph:

```bash title="Ubuntu terminal 3"
source /opt/ros/jazzy/setup.bash
ros2 node list
ros2 node info /talker
ros2 node info /listener
```

Expected result: `/talker` and `/listener` appear while those processes are running. Stop them with `Ctrl+C` when you are done.

Multiple terminals are normal in ROS 2. One terminal may be running a node while another terminal inspects it.

## Checkpoint C: Inspect a Topic

Open the official [Understanding ROS 2 topics tutorial](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Understanding-ROS2-Topics/Understanding-ROS2-Topics.html). Focus on listing, echoing, type checking, and rate checking. You can ignore `rqt_graph` if it is not installed.

Start the talker again if you stopped it, then run:

```bash title="Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
ros2 topic list -t
ros2 topic info /chatter --verbose
ros2 topic echo /chatter
ros2 topic hz /chatter
```

Expected result:

- `/chatter` appears with a message type
- `topic info --verbose` shows publishers and subscribers
- `topic echo` prints the message contents
- `topic hz` estimates the publish rate

A topic name and a message type both matter. Two nodes only communicate when they use the same topic name and compatible message type.

## Checkpoint D: Inspect a Message Type

Run:

```bash title="Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
ros2 interface show geometry_msgs/msg/Twist
```

You should see `linear` and `angular`, and each one is a `Vector3`. The next required page teaches how to read nested message output like that.

## Checkpoint E: Read a Python Node

Open the official [Writing a simple Python publisher and subscriber tutorial](https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html). You are not copying it into your robot package. Use it to locate these pieces:

| Thing to find | Why it matters later |
| --- | --- |
| `class ... (Node)` | your robot nodes will be Python classes that inherit from `Node` |
| node name | this must match YAML keys and what you see in `ros2 node list` |
| publisher | autonomy and odometry publish messages |
| subscription | motor and odometry nodes receive `cmd_vel` |
| callback | this function runs when a message arrives |
| timer | this function runs repeatedly at a chosen rate |
| `publish` | this sends a message onto a topic |
| `rclpy.init` | starts ROS support in the process |
| `rclpy.spin` | keeps the node alive so callbacks and timers can run |
| `main` | the function `console_scripts` points to |

You are ready for the next page when you can explain what is running, what is communicating, what message type is being exchanged, why multiple terminals are normal, and how to stop a node with `Ctrl+C`.

Next: [Create Your Workspace](/guides/ros2-package-guide/workspace/).
