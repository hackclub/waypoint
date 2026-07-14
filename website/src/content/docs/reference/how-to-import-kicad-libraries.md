---
title: How to Import KiCad Libraries
description: Import a KiCad 10.0 symbol and footprint library into a Waypoint project.
---

Follow these steps to import the `WaypointCarePackage` KiCad library package into a KiCad 10.0 project.

You need:

- `WaypointCarePackage.zip`
- A KiCad project with a `.kicad_pro` file

## 1. Extract the package

Extract `WaypointCarePackage.zip`. Do not point KiCad at the zip file itself.

After extraction, you should see `WaypointCarePackage.kicad_sym` and `WaypointCarePackage.pretty` next to each other.

## 2. Put the library inside your KiCad project

Open the folder that contains your `.kicad_pro` file. Create a folder named `libraries` if it does not already exist.

Copy both extracted library items into `libraries`.

Your project should look like this:

```text
YourProject/
  YourProject.kicad_pro
  YourProject.kicad_sch
  YourProject.kicad_pcb
  libraries/
    WaypointCarePackage.kicad_sym
    WaypointCarePackage.pretty/
```

Keep this exact folder structure so the included 3D models resolve.

![Project folder with the WaypointCarePackage files in a libraries folder](/images/reference/kicad-library-import/step2.png)

## 3. Open the project in KiCad 10.0

Launch KiCad 10.0 and open the project's `.kicad_pro` file.

![KiCad project open in the Project Manager](/images/reference/kicad-library-import/step3.png)

## 4. Add the symbol library

Open **Preferences -> Manage Symbol Libraries...**.

Choose **Project Specific Libraries**, then click the folder button and select:

```text
libraries/WaypointCarePackage.kicad_sym
```

Use this nickname:

```text
WaypointCarePackage
```

Use this path:

```text
${KIPRJMOD}/libraries/WaypointCarePackage.kicad_sym
```

Click **OK** or **Apply**.

![WaypointCarePackage symbol library added to Project Specific Libraries](/images/reference/kicad-library-import/step4.png)

## 5. Add the footprint library

Open **Preferences -> Manage Footprint Libraries...**.

Choose **Project Specific Libraries**, then click the folder button and select:

```text
libraries/WaypointCarePackage.pretty
```

Use this nickname:

```text
WaypointCarePackage
```

Use this path:

```text
${KIPRJMOD}/libraries/WaypointCarePackage.pretty
```

Click **OK** or **Apply**.

![WaypointCarePackage footprint library added to Project Specific Libraries](/images/reference/kicad-library-import/step5.png)

You can now use the `WaypointCarePackage` libraries inside your schematic and PCB layout.

## Troubleshooting

**The library does not show up in Add Symbol or Add Footprint:** Make sure you added it on the **Project Specific Libraries** tab for the project you currently have open, then reopen the Add Symbol or Add Footprint dialog.

**KiCad will not let you select the package:** Extract the zip first. Symbol libraries are added from `.kicad_sym` files, and footprint libraries are added from `.pretty` folders.

**The footprint appears, but the 3D model is missing:** Put the library folder under the project as `libraries/WaypointCarePackage.pretty`.

**You want the library available in every project:** Add the same symbol and footprint entries on the **Global Libraries** tab instead.