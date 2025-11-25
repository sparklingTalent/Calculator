# Frontend Component Documentation

Complete reference for all React components in the Portless Shipping Calculator frontend.

## Table of Contents

1. [Calculator](#calculator)
2. [ResultCard](#resultcard)
3. [EmailModal](#emailmodal)
4. [InputField](#inputfield)

---

## Calculator

**File:** `frontend/src/components/Calculator.jsx`

The main calculator component that handles user input, data fetching, and calculation logic.

### Description

The Calculator component is the core of the application. It:
- Fetches available countries and shipping lines from the API
- Manages form state (country, zone, shipping line, weight)
- Handles conditional zone display (e.g., for Australia)
- Performs shipping cost calculations
- Displays results via the ResultCard component

### Props

None. This is the root component.

### State

| State Variable | Type | Description |
|----------------|------|-------------|
| `formData` | `object` | Form input values: `{ country, shippingLine, zone, weight, weightUnit }` |
| `countries` | `string[]` | Array of available country names |
| `countriesData` | `object` | Full country data from API (zones, shipping lines, etc.) |
| `availableShippingLines` | `array` | Shipping lines available for selected country/zone |
| `selectedShippingLineData` | `object\|null` | Data for currently selected shipping line |
| `calculation` | `object\|null` | Calculation result from API |
| `loading` | `boolean` | Whether calculation is in progress |
| `loadingData` | `boolean` | Whether initial data is loading |
| `error` | `string\|null` | Error message if any |
| `availableZones` | `string[]` | Zones available for selected country |
| `isCalculating` | `boolean` | Whether calculation request is in progress |
| `weightSuggestions` | `array` | Closest available weights when user enters invalid weight |

### Key Functions

#### `fetchCountries()`

Fetches all countries and their shipping line data from `/api/countries`.

**Returns:** `Promise<void>`

**Side Effects:**
- Sets `countries` state with country names
- Sets `countriesData` state with full country data
- Updates `availableShippingLines` based on selected country

#### `handleInputChange(name, value)`

Handles changes to form inputs.

**Parameters:**
- `name` (string): Field name ('country', 'zone', 'shippingLine', 'weight', 'weightUnit')
- `value` (any): New value

**Side Effects:**
- Updates `formData` state
- Clears calculation result
- Updates available zones/shipping lines when country changes
- Clears weight suggestions when relevant fields change

#### `handleCalculate()`

Submits calculation request to API.

**Returns:** `Promise<void>`

**Side Effects:**
- Sets `loading` to true
- Calls `/api/calculate` endpoint
- Sets `calculation` state with result
- Handles errors and displays error messages

#### `handleReset()`

Resets the form to initial state.

**Side Effects:**
- Clears all form fields
- Resets to default weight unit (lb)
- Clears calculation result
- Clears errors

#### `findClosestWeights(enteredWeight)`

Finds the closest available weights (one lower, one higher) when user enters a weight that doesn't exactly match available options.

**Parameters:**
- `enteredWeight` (number): Weight entered by user

**Returns:** `{ lower: number\|null, higher: number\|null }`

**Logic:**
- Extracts all available weights from selected shipping line data
- Finds closest lower and higher weights
- Uses epsilon (0.001) for floating-point comparison

#### `getAustralianZoneDescription(zoneName)`

Returns zone description with city/region information for Australian zones.

**Parameters:**
- `zoneName` (string): Zone name (e.g., "Zone 1")

**Returns:** `string` - Zone name with description (e.g., "Zone 1 (Sydney, Brisbane, Canberra)")

### Effects

#### `useEffect(() => { fetchCountries(); }, [])`

Fetches countries on component mount.

#### `useEffect(() => { ... }, [formData.country, countriesData])`

Updates zones and shipping lines when country changes.

#### `useEffect(() => { ... }, [formData.country, formData.zone, countriesData])`

Updates available shipping lines when country or zone changes.

#### `useEffect(() => { ... }, [formData.weight, formData.country, formData.zone, formData.shippingLine, formData.weightUnit])`

Debounced effect (300ms) that finds closest weights when user enters weight.

### API Calls

- **GET** `/api/countries` - Fetches countries and shipping lines
- **POST** `/api/calculate` - Calculates shipping costs

### Dependencies

- `react` - React hooks (useState, useEffect)
- `axios` - HTTP client for API calls
- `InputField` - Reusable input component
- `ResultCard` - Results display component

### Example Usage

```jsx
import Calculator from './components/Calculator';

function App() {
  return (
    <div className="App">
      <Calculator />
    </div>
  );
}
```

---

## ResultCard

**File:** `frontend/src/components/ResultCard.jsx`

Displays calculation results in a formatted card.

### Description

The ResultCard component shows:
- Shipping cost breakdown
- Pick and pack fee
- Total cost
- Notes on shipping estimate
- Download results button

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `calculation` | `object\|null` | Yes | Calculation result from API |
| `loading` | `boolean` | Yes | Whether calculation is in progress |

### Calculation Object Structure

```typescript
{
  shippingCost: number;      // Total shipping cost
  fulfillmentFee: number;   // Pick and pack fee (1.50)
  totalCost: number;        // Total cost
  deliveryDays: string;      // Delivery estimate
  serviceName: string;       // Shipping line name
  weightUsed: number;        // Weight used in calculation
  weightUnit: string;        // "lb" or "kg"
  freightPerUnit: number;   // Freight rate per unit
  baseRate: number | null;  // Base rate (if applicable)
  perKgRate: number | null; // Rate per kg
  perLbRate: number | null; // Rate per lb
}
```

### State

| State Variable | Type | Description |
|----------------|------|-------------|
| `showEmailModal` | `boolean` | Whether email modal is visible |

### Rendering States

1. **Loading State**: Shows spinner and "Calculating your rate..." message
2. **Empty State**: Shows placeholder with instructions
3. **Result State**: Shows full calculation breakdown

### Key Features

- **Cost Breakdown**: Displays shipping cost, pick & pack, and total
- **Notes Section**: Shows storage, packaging, and billable weight notes
- **Download Button**: Opens EmailModal for PDF download
- **Responsive Design**: Adapts to different screen sizes

### Dependencies

- `react` - React hooks (useState)
- `EmailModal` - Email input modal component

### Example Usage

```jsx
import ResultCard from './components/ResultCard';

function MyComponent() {
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <ResultCard 
      calculation={calculation}
      loading={loading}
    />
  );
}
```

---

## EmailModal

**File:** `frontend/src/components/EmailModal.jsx`

Modal component for email input to receive PDF results.

### Description

A modal dialog that allows users to:
- Enter their email address
- Request PDF download of calculation results
- Cancel the request

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Whether modal is visible |
| `onClose` | `function` | Yes | Callback when modal should close |
| `onSend` | `function` | Yes | Callback when user clicks "Send PDF" |

### Props Details

#### `onClose()`

Called when:
- User clicks "Cancel" button
- User clicks close (×) button
- User clicks outside modal (overlay)

**No parameters.**

#### `onSend(email)`

Called when user clicks "Send PDF" button.

**Parameters:**
- `email` (string): User's email address

**Returns:** `Promise<void>`

**Note:** Currently shows alert. Should be implemented to actually send PDF via backend.

### State

| State Variable | Type | Description |
|----------------|------|-------------|
| `email` | `string` | Email input value |
| `sending` | `boolean` | Whether email is being sent |

### Features

- **Email Validation**: Basic validation (must contain "@")
- **Enter Key Support**: Press Enter to submit
- **Loading State**: Shows "Sending..." while processing
- **Error Handling**: Displays error alerts
- **Accessibility**: Proper ARIA labels

### Validation

- Email must contain "@" symbol
- Email cannot be empty
- Submit button disabled while sending

### Dependencies

- `react` - React hooks (useState)

### Example Usage

```jsx
import EmailModal from './components/EmailModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  const handleSend = async (email) => {
    // TODO: Implement PDF generation and email sending
    console.log('Sending PDF to:', email);
    // Call backend API to generate and send PDF
  };

  return (
    <EmailModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onSend={handleSend}
    />
  );
}
```

---

## InputField

**File:** `frontend/src/components/InputField.jsx`

Reusable input field component with label and optional icon.

### Description

A simple, reusable input component that provides:
- Label with optional icon
- Consistent styling
- All standard input props support

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Label text for the input |
| `icon` | `string\|ReactNode` | No | Optional icon (emoji or React element) |
| `...props` | `any` | No | All standard HTML input props (type, placeholder, value, onChange, etc.) |

### Features

- **Flexible**: Accepts all standard input props
- **Icon Support**: Optional icon before label
- **Consistent Styling**: Matches design system

### Dependencies

- `react` - React

### Example Usage

```jsx
import InputField from './components/InputField';

function MyForm() {
  const [weight, setWeight] = useState('');

  return (
    <InputField
      label="Weight - including packaging"
      icon="⚖️"
      type="number"
      value={weight}
      onChange={(e) => setWeight(e.target.value)}
      placeholder="Enter weight"
      min="0"
      step="0.01"
    />
  );
}
```

---

## Component Hierarchy

```
App
└── Calculator
    ├── InputField (Country dropdown)
    ├── InputField (Zone dropdown - conditional)
    ├── InputField (Shipping Line dropdown)
    ├── InputField (Weight input)
    ├── InputField (Weight unit toggle)
    ├── ResultCard
    │   └── EmailModal
    └── (Weight suggestions - conditional)
```

---

## Styling

All components have corresponding CSS files:
- `Calculator.css` - Calculator component styles
- `ResultCard.css` - ResultCard component styles
- `EmailModal.css` - EmailModal component styles
- `InputField.css` - InputField component styles

### CSS Variables

Components use CSS variables defined in `index.css`:

```css
:root {
  --portless-blue: #0b215d;
  --portless-blue-light: #0d2a6f;
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --border: #e0e0e0;
  --surface: #f5f5f5;
  --radius: 8px;
  --radius-xl: 16px;
}
```

---

## State Management

The application uses React's built-in state management:
- **Local State**: Each component manages its own state with `useState`
- **Props**: Data flows down from parent to child
- **Callbacks**: Events flow up from child to parent via callback props

No external state management library (Redux, Zustand, etc.) is used.

---

## API Integration

All API calls are made using `axios`:

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Example API call
const response = await axios.get(`${API_BASE_URL}/api/countries`);
```

### Environment Variables

- `VITE_API_URL`: Backend API URL (required in production)

---

## Error Handling

Components handle errors in different ways:

1. **Calculator**: Displays error messages below form
2. **ResultCard**: Shows error state if calculation fails
3. **EmailModal**: Shows alert for validation errors

### Error Display

```jsx
{error && (
  <div className="error-message">
    {error}
  </div>
)}
```

---

## Accessibility

Components include basic accessibility features:

- **Labels**: All inputs have associated labels
- **ARIA Labels**: Modal close button has `aria-label`
- **Keyboard Navigation**: Enter key support in EmailModal
- **Focus Management**: Proper focus handling in modals

---

## Performance Considerations

1. **Debouncing**: Weight suggestions are debounced (300ms)
2. **Conditional Rendering**: Zones only render when needed
3. **Memoization**: Consider using `useMemo` for expensive calculations (currently not implemented)
4. **API Caching**: Backend caches responses, reducing API calls

---

*Last Updated: [Current Date]*

