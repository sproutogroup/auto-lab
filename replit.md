# replit.md

## Overview

This project is a full-stack car dealership management system, enhanced as a Progressive Web Application (PWA). It provides comprehensive tools for managing vehicle inventory, customer relationships, sales processes, and business operations with a native app-like experience and offline capabilities. The system aims to streamline dealership workflows, improve data accuracy, and provide real-time business intelligence for informed decision-making.

## User Preferences

- Preferred communication style: Simple, everyday language
- Typography: SF Pro Display/Text for professional, Apple-inspired appearance
- Design: Luxury styling with red accent colors, glassmorphism effects, minimal and sophisticated aesthetics
- Sidebar: Collapsible with dual toggle options (header menu + internal arrow)
- Authentication: Luxury split-screen design with black/white contrast, bold slanted "AUTOLAB" branding, password visibility toggle for enhanced UX
- Branding: Stylized "AUTOLAB" text preferred over logo images for better integration

## System Architecture

The application is built as a monorepo, separating client, server, and shared code.

### Core Technologies

- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter.
- **Backend**: Express.js with TypeScript, Drizzle ORM.
- **Database**: PostgreSQL.
- **Real-time Communication**: Socket.IO for live updates.
- **PWA Capabilities**: Service worker, manifest, IndexedDB for offline data, multi-tier caching.

### Key Architectural Decisions

- **Monorepo Structure**: Facilitates cohesive development and code sharing.
- **PWA First**: Designed for native app-like experience, offline functionality, and push notifications across platforms (iOS, Android, Web).
- **Luxury UI/UX**: Consistent, sophisticated design using shadcn/ui, custom gradients, and muted color palettes for a premium feel.
- **Real-time Data Synchronization**: WebSocket-based system ensures all clients receive immediate updates for critical data (e.g., dashboard, vehicle changes).
- **Type Safety**: End-to-end TypeScript implementation with Drizzle ORM for robust data handling.
- **Comprehensive Business Intelligence**: Integrated dashboards and reports provide real-time and historical analytics across sales, inventory, finance, and operations.
- **Role-Based Access Control (RBAC)**: Granular permission system for user management, controlling page-level access and API interactions.
- **Automated Data Processing**: CSV import with intelligent field mapping and real-time financial calculations.
- **Modular Feature Development**: Components like Notification System, DealerGPT AI, and Logistics Management are built as distinct, integrated modules.
- **Data Integrity**: Strict validation, foreign key constraint handling, and `snake_case` standardization throughout the database and application.

### Feature Specifications

- **Vehicle Management**: Full CRUD for vehicles, CSV import, detailed financial calculations, real-time stock aging.
- **Customer Relationship Management (CRM)**: Customer profiles, lead management with pipeline stages, lead-to-customer conversion, interaction tracking, and communication consent.
- **Sales Management**: Sales transaction records, invoice management with PDF upload, sales analytics.
- **Logistics & Job Management**: Scheduling, staff assignment, job lifecycle tracking (delivery, collection, inspection, etc.), calendar view, and history.
- **Appointment Booking**: Integrated calendar, customer selection, appointment types, and reminders.
- **Notifications**: Real-time push notifications (WebPush, iOS local notifications), configurable preferences, and intelligent triggers.
- **AI Assistant (DealerGPT)**: Context-aware AI with historical data access, memory, proactive insights, and natural language processing.
- **Dashboard & Reporting**: Real-time key performance indicators (KPIs), financial audits, sales performance, inventory turnover, and executive summaries.

## External Dependencies

- **PostgreSQL**: Primary database (e.g., Neon serverless).
- **Drizzle ORM**: Database toolkit.
- **shadcn/ui**: UI component library (built on Radix UI).
- **Lucide React**: Icon library.
- **Vite**: Frontend build tool.
- **TypeScript**: Programming language.
- **Tailwind CSS**: Styling framework.
- **TanStack Query**: Server state management.
- **Wouter**: Client-side routing.
- **Socket.IO**: Real-time communication library.
- **Helmet.js**: Security middleware for Express.
- **Winston**: Logging library.
- **Jest**: Testing framework.
- **web-push**: Library for sending push notifications.
- **OpenAI API**: For AI capabilities in DealerGPT.
- **IndexedDB**: Browser-side database for PWA offline storage.
