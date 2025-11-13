# Selection Background Height Fix

## Problem
The selection background bar height was not matching the item height exactly, causing it to potentially overlap with adjacent items' content.

## Root Cause
The CSS had padding applied to the content div inside the selected item:
- `.audio-item__content` had `padding: 8px 12px` (vertical padding of 8px)
- `.audio-tree__item-content` had `padding: 4px 8px` (vertical padding of 4px)

This caused the background color to extend beyond the intended item boundaries.

## Solution
1. Removed vertical padding from content divs and moved it to horizontal-only padding
2. Set explicit height on content divs to match the react-window item height (40px)
3. Added `line-height: 1` to parent items to prevent line-height from affecting height
4. Added `box-sizing: border-box` to ensure padding is included in height calculation
5. Removed default margin/padding from item containers

## Changes Made

### AudioItem Component CSS
```css
.audio-item {
  margin: 0;
  padding: 0;
  line-height: 1;
}

.audio-item__content {
  height: 40px;
  padding: 0 12px;  /* Horizontal padding only */
  box-sizing: border-box;
}
```

### AudioTree Item CSS
```css
.audio-tree__item {
  margin: 0;
  padding: 0;
  line-height: 1;
}

.audio-tree__item-content {
  height: 40px;
  padding: 0 8px;  /* Horizontal padding only */
  box-sizing: border-box;
}
```

## Verification
The selection background now:
- Has exactly 40px height (matching the react-window itemHeight)
- Does not overlap with adjacent items
- Aligns perfectly with the item boundaries
- Maintains proper spacing through horizontal padding only

## Requirements Addressed
- Requirement 4.11: Selection background height matches item height exactly
- Avoids background bar covering adjacent items' content
- Ensures proper CSS styling with correct padding, margin, and line-height
