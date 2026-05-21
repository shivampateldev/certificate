# UI Components Library

This directory contains a comprehensive set of reusable UI components following the IEEE SOUSB design system. All components are built with accessibility, responsiveness, and consistency in mind.

## Design System

### Color Scheme
The components use CSS variables defined in `App.css` that follow the IEEE SOUSB-inspired color palette:
- **Primary**: Blue variations (`--primary-50` to `--primary-900`)
- **Secondary**: Purple accents (`--secondary-50` to `--secondary-900`)
- **Status Colors**: Success, Warning, Error, Info
- **Neutral**: Gray scale (`--gray-50` to `--gray-900`)

### Typography
- Font Family: Inter (with fallbacks)
- Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- Responsive font sizes with utility classes

### Spacing
Consistent spacing using CSS variables:
- `--spacing-xs`: 0.25rem
- `--spacing-sm`: 0.5rem
- `--spacing-md`: 1rem
- `--spacing-lg`: 1.5rem
- `--spacing-xl`: 2rem
- `--spacing-2xl`: 3rem

## Core Components

### Button
Enhanced button component with multiple variants and states.

```jsx
import { Button, IconButton, ButtonGroup } from './components';

// Basic usage
<Button variant="primary" size="medium">Click me</Button>

// With icon
<Button icon="📧" iconPosition="left">Send Email</Button>

// Loading state
<Button loading={true}>Processing...</Button>

// Icon only
<IconButton icon="⚙️" tooltip="Settings" />

// Button group
<ButtonGroup>
  <Button>First</Button>
  <Button>Second</Button>
  <Button>Third</Button>
</ButtonGroup>
```

**Props:**
- `variant`: primary, secondary, success, warning, danger, outline, ghost
- `size`: small, medium, large
- `loading`: boolean
- `disabled`: boolean
- `fullWidth`: boolean
- `icon`: React node
- `iconPosition`: left, right

### Input Components
Comprehensive form input components with validation.

```jsx
import { Input, Textarea, Select } from './components';

// Text input with validation
<Input
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  required
  clearable
/>

// Textarea
<Textarea
  label="Description"
  rows={4}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>

// Select dropdown
<Select
  label="Category"
  options={[
    { value: 'tech', label: 'Technical' },
    { value: 'non-tech', label: 'Non-technical' }
  ]}
  value={category}
  onChange={(e) => setCategory(e.target.value)}
/>
```

### Loading & Progress
Components for indicating loading states and progress.

```jsx
import { LoadingSpinner, ProgressBar } from './components';

// Loading spinner
<LoadingSpinner 
  size="medium" 
  color="primary" 
  message="Loading data..." 
/>

// Progress bar
<ProgressBar 
  progress={75} 
  color="success" 
  animated 
  label="Upload Progress" 
/>
```

### Feedback Components
Components for user feedback and notifications.

```jsx
import { Alert, Toast, Modal } from './components';

// Alert
<Alert type="success" title="Success!" dismissible>
  Your changes have been saved.
</Alert>

// Toast notification
<Toast 
  message="File uploaded successfully" 
  type="success" 
  duration={4000} 
/>

// Modal
<Modal 
  isOpen={showModal} 
  onClose={() => setShowModal(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

## Display Components

### Badge & Status
Small labels and status indicators.

```jsx
import { Badge, StatusBadge } from './components';

// Basic badge
<Badge variant="primary" size="small">New</Badge>

// Status badge (auto-colors based on status)
<StatusBadge status="completed" />
<StatusBadge status="pending" />
<StatusBadge status="failed" />
```

### Card Components
Flexible container components for content display.

```jsx
import { Card, StatsCard, MetricCard, FeatureCard } from './components';

// Basic card
<Card title="Card Title" subtitle="Subtitle">
  <p>Card content goes here</p>
</Card>

// Stats card for metrics
<StatsCard
  title="Total Users"
  value="1,234"
  change="+12%"
  changeType="positive"
  icon="👥"
  color="primary"
/>

// Feature card
<FeatureCard
  icon="📊"
  title="Analytics"
  description="View detailed reports and insights"
  action={<Button>Learn More</Button>}
/>
```

### Skeleton Loading
Placeholder components for loading states.

```jsx
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable } from './components';

// Basic skeleton
<Skeleton width="200px" height="20px" />

// Text skeleton
<SkeletonText lines={3} />

// Card skeleton
<SkeletonCard />

// Table skeleton
<SkeletonTable rows={5} columns={4} />
```

### Tooltip
Contextual information on hover or focus.

```jsx
import Tooltip from './components/Tooltip';

<Tooltip content="This is helpful information" position="top">
  <Button>Hover me</Button>
</Tooltip>
```

## Form Validation

### Validation Components
```jsx
import { FormError, FormSuccess, useFormValidation } from './components';

// Individual validation messages
<FormError message="This field is required" />
<FormSuccess message="Looks good!" />

// Form validation hook
const {
  values,
  errors,
  handleChange,
  handleBlur,
  validateForm
} = useFormValidation(
  { email: '', password: '' },
  {
    email: [
      { validator: validateRequired, message: 'Email is required' },
      { validator: validateEmail, message: 'Invalid email format' }
    ],
    password: [
      { validator: validateRequired, message: 'Password is required' },
      { validator: (v) => validateMinLength(v, 8), message: 'Password must be at least 8 characters' }
    ]
  }
);
```

## Accessibility Features

All components include:
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **High Contrast Support**: Works with high contrast mode
- **Reduced Motion**: Respects `prefers-reduced-motion`

## Responsive Design

Components are fully responsive with:
- Mobile-first approach
- Flexible layouts using CSS Grid and Flexbox
- Responsive typography and spacing
- Touch-friendly interactive elements

## Usage Guidelines

### Import Pattern
```jsx
// Import specific components
import { Button, Input, Card } from './components';

// Or import from specific files
import Button from './components/Button';
```

### Styling
- Use CSS variables for consistent theming
- Extend existing styles rather than overriding
- Follow the established naming conventions
- Use utility classes from `App.css` when possible

### Best Practices
1. **Consistency**: Use the same component variants across similar use cases
2. **Accessibility**: Always provide proper labels and ARIA attributes
3. **Performance**: Use loading states for async operations
4. **Validation**: Provide clear, helpful error messages
5. **Responsive**: Test components on different screen sizes

## Component Status

✅ **Complete**: Button, Input, LoadingSpinner, ProgressBar, FormValidation, Toast, Modal, Badge, Alert, Skeleton, Tooltip, Card

🔄 **In Progress**: Advanced form components, data visualization components

📋 **Planned**: Dropdown menus, tabs, accordion, pagination, data tables

## Contributing

When adding new components:
1. Follow the established patterns and naming conventions
2. Include proper TypeScript types (if using TypeScript)
3. Add comprehensive CSS with all variants and states
4. Include accessibility features
5. Test on multiple screen sizes
6. Update this documentation