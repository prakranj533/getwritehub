# BookHub - Collaborative Book Writing Platform

A GitHub-like platform for collaborative book writing. Create books, invite co-authors, review chapters with version control, and publish your work.

## Features

- **Book Management**: Create private or public books
- **Collaborative Writing**: Invite editors and reviewers to your book
- **Chapter Version Control**: Every edit saves a new version - restore any previous version
- **Review System**: Submit chapters for review, get feedback, approve or request changes
- **Publishing**: Publish books publicly or keep them private
- **GitHub-like UI**: Familiar interface for managing your writing projects

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase:
   - Create a project in the [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database and Firebase Authentication (Email/Password)
   - Copy your Firebase config to `.env.local` (see `.env.local.example`)

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default User

Create an account through the signup page to get started.

## Usage Guide

### Creating a Book

1. Sign up or sign in to your account
2. Click "New Book" in the navigation
3. Enter a title and description
4. Choose visibility: Public (anyone can see) or Private (only you and collaborators)
5. Click "Create Book"

### Adding Chapters

1. Open your book
2. Click "Add Chapter" button
3. Enter the chapter title
4. Write your content in the editor
5. Save your work with the "Submit to Branch" button

### Version Control & Offline Writing

- **Offline Support**: Write even without an internet connection. Changes are auto-saved locally.
- **Submit to Branch**: When online, push your local changes to the main book branch.
- **Version History**: Every submission creates a new version - restore any previous version from the sidebar.

### Submitting for Review

1. When you're ready for feedback, click "Submit for Review"
2. The chapter status changes to "review"
3. Collaborators can now add their reviews

### Reviewing Chapters

1. Open a chapter that's in "review" status
2. Click "Add Review" in the reviews section
3. Choose to "Approve" or "Request Changes"
4. Add comments explaining your feedback
5. Submit the review

### Publishing Chapters

Once all reviews are approved:
1. Click "Publish" to make the chapter live
2. Published chapters are visible to all readers

### Managing Collaborators

1. Go to the "Collaborators" tab in your book
2. Click "Add Collaborator"
3. Enter the email of the person you want to invite
4. They'll be added as an editor (can write chapters)

### Publishing Your Book

1. Click "Publish" button on your book page
2. The book status changes to "published"
3. If public, it appears in the Discover section

## Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Firebase / Firestore (Serverless)
- **Database**: Google Firestore
- **Authentication**: Firebase Authentication
- **Offline Storage**: IndexedDB / LocalStorage for drafts
- **UI Components**: Custom components with Lucide icons

## Data Model

- **User**: Authors and collaborators (Firebase Auth)
- **Book**: Container for chapters with visibility settings (Firestore)
- **Chapter**: Individual sections with content and status (Firestore)
- **Review**: Feedback on chapters (Firestore)
- **Collaborator**: Relationship between users and books (Firestore)
- **ChapterVersion**: Historical snapshots of chapter content (Firestore)

## License

MIT
