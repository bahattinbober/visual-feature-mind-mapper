Visual Feature Mind-Mapper

A visual mind-mapping web application that allows users to create, connect, organize, and explore ideas through draggable nodes and curved connections.
Designed to demonstrate interactive UI development, state management, and graph-based thinking using modern frontend technologies.

🔗 Live Demo:( )
📦 Source Code:( )


Key Highlights (Recruiter Summary)


* Built an interactive node-based visualization tool

* Implemented drag & drop, auto-layout, and undo / redo

* Designed scalable canvas logic with dynamic resizing

* Managed complex UI state with history tracking

* Focused on usability, performance, and clean architecture


Features

* Create, rename, recolor, and delete nodes

* Connect nodes with curved SVG paths

* Drag nodes freely across the board

* Auto-layout algorithm for structured positioning

* Undo / Redo support (Ctrl + Z / Ctrl + Y)

* Right-click context menu for node actions

* Local persistence using browser localStorage

* Export mind map as:

     * JSON

     * Image (PNG)

* Responsive and scrollable canvas for large maps

   Technical Stack

| Category         | Technologies         |
| ---------------- | -------------------- |
| Framework        | Next.js (App Router) |
| Language         | TypeScript           |
| Frontend         | React                |
| Styling          | Tailwind CSS         |
| Visualization    | SVG                  |
| State Management | React Hooks          |
| Persistence      | localStorage         |
| Deployment       | Vercel               |



Architecture Overview

 * Node System

     * Each node stores position, title, color, and relations

 * Edge System

    * Connections rendered via SVG Bézier curves

 * Canvas Logic

    * Supports large virtual space with scrolling and scaling

 * History Management

    * Snapshot-based undo/redo mechanism

 * Interaction Handling

    * Pointer events for drag, select, and context menus


Why This Project Matters

 * This project demonstrates the ability to:

 * Build complex interactive UIs

 * Manage graph-like data structures

 * Implement advanced user interactions

 * Design scalable frontend architectures

 * Translate abstract ideas into visual systems


 Getting Started

 git clone <repository-url>
 cd visual-feature-mind-mapper
 npm install
 npm run dev
 Open: http://localhost:3000


 Potential Enhancements

  * Zoom controls with mouse wheel

  * Grouping / clustering nodes

  * Keyboard-only navigation

  * Cloud sync & authentication

  * Collaboration / real-time editing


  Author

      Bahattin Bober
    Computer Engineering Student 