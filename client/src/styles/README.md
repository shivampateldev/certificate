# Design System Documentation

## Overview

This design system implements a light theme with Material Design elements for the mass mailer application. It provides consistent styling, spacing, typography, and component patterns across all pages.

## Color Palette

### Primary Colors
- `--primary-background`: #FFFFFF (White backgrounds)
- `--secondary-background`: #F8FAFC (Light gray backgrounds)
- `--primary-blue`: #2563EB (Primary blue for buttons and accents)
- `--secondary-blue`: #3B82F6 (Secondary blue for gradients)
- `--cyan-accent`: #06B6D4 (Cyan accent color)
- `--light-cyan`: #67E8F9 (Light cyan for highlights)

### Text Colors
- `--text-primary`: #1F2937 (Primary text color)
- `--text-secondary`: #6B7280 (Secondary text color)
- `--border-color`: #E5E7EB (Border color)

## Typography Scale

### Font Sizes
- `--text-xs`: 0.75rem (12px)
- `--text-sm`: 0.875rem (14px)
- `--text-base`: 1rem (16px)
- `--text-lg`: 1.125rem (18px)
- `--text-xl`: 1.25rem (20px)
- `--text-2xl`: 1.5rem (24px)
- `--text-3xl`: 1.875rem (30px)
- `--text-4xl`: 2.25rem (36px)

### Font Weights
- `--font-normal`: 400
- `--font-medium`: 500
- `--font-semibold`: 600
- `--font-bold`: 700

## Spacing System

### Base Spacing Scale
- `--spacing-xs`: 0.25rem (4px)
- `--spacing-sm`: 0.5rem (8px)
- `--spacing-md`: 1rem (16px)
- `--spacing-lg`: 1.5rem (24px)
- `--spacing-xl`: 2rem (32px)
- `--spacing-2xl`: 3rem (48px)
- `--spacing-3xl`: 4rem (64px)

## Component Classes

### Buttons
- `.btn-primary`: Primary blue gradient button
- `.btn-secondary`: White button with border
- `.btn-tertiary`: Transparent button with blue text

### Material Design Components
- `.md-card`: Material Design card with elevation
- `.md-stepper`: Horizontal/vertical stepper component
- `.md-how-it-works`: "How it works" section styling
- `.md-how-to-use`: "How to use" section styling

### Tables
- `.table-material`: Material Design table styling
- `.table-container`: Container with proper elevation and borders

## Usage Examples

### Basic Button
```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-tertiary">Tertiary Action</button>
```

### Material Design Card
```html
<div class="md-card">
  <div class="md-card-header">
    <h3 class="md-card-title">Card Title</h3>
    <p class="md-card-subtitle">Card subtitle</p>
  </div>
  <div class="md-card-content">
    Card content goes here
  </div>
</div>
```

### Material Design Table
```html
<div class="table-container">
  <table class="table-material">
    <thead>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```