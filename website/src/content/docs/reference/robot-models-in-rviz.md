---
title: Robot Models in RViz
description: Optionally show your own chassis STL in RViz without inventing extra robot parts.
---

This is a polish reference, not a requirement for making the robot move. A clean model can make your submission easier to understand, but the important thing is that it is actually your chassis.

## Keep CAD Source and Display Asset Separate

Store the editable assembly in your repository's CAD folder as a `.step` or native CAD file. RViz does not render STEP directly from a URDF, so export a separate STL for viewing and place it under `meshes/` in the ROS package.

Before exporting, check:

- the model is the assembled chassis, not a random test body
- its forward direction matches your chosen `base_link` x axis
- its unit scale is known; many CAD tools export STL in millimeters while ROS uses meters
- the mesh is reasonably small enough to load quickly

## Describe One Body First

A basic robot can have one URDF link named `base_link` with a visual mesh. The important fragment is the mesh reference:

```xml title="URDF visual fragment"
<visual>
  <geometry>
    <mesh filename="package://<package_name>/meshes/<your_chassis>.stl" scale="0.001 0.001 0.001" />
  </geometry>
</visual>
```

The scale above is only an example for a millimeter STL. Measure your result in RViz and set the scale that matches your export. Do not add a cube fallback: if the model is missing, fix the path or add your real STL.

Put that link in a URDF file under `urdf/`, make `setup.py` install both `urdf/` and `meshes/`, and launch `robot_state_publisher` with the URDF supplied as its `robot_description` parameter. The official [URDF and robot_state_publisher tutorial](https://docs.ros.org/en/jazzy/Tutorials/Intermediate/URDF/Using-URDF-with-Robot-State-Publisher.html) shows the complete ROS plumbing.

## Keep the TF Tree Honest

A single fixed `base_link` visual does not need a joint state publisher. It also does not need modeled wheels, an IMU visual, or a pretend suspension. Add a link only when it has a meaningful transform or visible role in your project.

In RViz, add **RobotModel** to view the STL and **Axes** set to `base_link` when you want to see the robot's own orientation. The axes display is independently toggleable, so it does not clutter your normal view.

Return to [See it in RViz](/guides/ros2-package-guide/rviz/) when you are ready to connect the model to the real odometry and path.
