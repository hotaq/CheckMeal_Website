# Meal Check-in Application

A simple web application that allows users to upload meal photos for check-in. The application stores the data in a Google Sheet via SheetDB and displays a history of past submissions.

## Features

- Upload meal photos
- Enter your name
- View history of past check-ins
- Data stored in Google Sheets via SheetDB
- Automatic image compression to reduce file size

## Setup

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No additional setup required - the SheetDB API endpoint is already configured

## Usage

1. Enter your name in the "Your Name" field
2. Click "Choose File" to select a meal photo from your device
3. Click "Submit Check-in" to upload your data
4. View your submission and past check-ins in the history section below

## Technical Details

- The application uses SheetDB API to interact with Google Sheets
- Images are automatically resized and compressed before storage
- Maximum image width is set to 800px to reduce file size
- Images are converted to JPEG format with 70% quality
- The history section displays the most recent check-ins first

## Google Sheet Structure

The application expects the Google Sheet to have the following columns:
1. Time (timestamp)
2. Meal name (user input)
3. meal photo (base64 encoded)
4. Check (checkmark)

## Notes

- SheetDB has a limit of 50,000 characters per cell
- Images are automatically compressed to fit within this limit
- The application requires an internet connection to function properly
- For privacy reasons, consider using a private Google Sheet for production use
- SheetDB provides a simple REST API for Google Sheets integration 