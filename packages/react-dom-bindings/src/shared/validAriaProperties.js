/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ARIA 1.3 Attributes Reference:
 * https://www.w3.org/TR/wai-aria-1.3/
 *
 * The object below enumerates all valid ARIA attributes, including those added in ARIA 1.3.
 * Each attribute is included even if it doesn't apply to the current element, as React cannot
 * validate element-specific constraints. The validation hook will allow these on any element,
 * and it is the developer's responsibility to use them correctly.
 */

const ariaProperties = {
  // Global ARIA Attributes (valid on all elements)
  'aria-current': 0, // Marks the element as the current item in a navigation context
  'aria-description': 0, // Provides an expanded description of an element
  'aria-details': 0, // Links to an element that provides additional details
  'aria-disabled': 0, // Indicates the element is perceivable but disabled
  'aria-hidden': 0, // Removes the element from the accessibility tree
  'aria-invalid': 0, // Indicates the element has an error
  'aria-keyshortcuts': 0, // Lists keyboard shortcuts for the element
  'aria-label': 0, // Defines a string label for the element
  'aria-roledescription': 0, // Provides a description for the element's role

  // Widget Attributes (for interactive elements)
  'aria-autocomplete': 0, // Indicates whether autocomplete is available
  'aria-checked': 0, // Indicates the state of a checkable element
  'aria-expanded': 0, // Indicates whether the element's content is expanded
  'aria-haspopup': 0, // Indicates whether the element has a popup menu
  'aria-level': 0, // Defines the hierarchical level of an element
  'aria-modal': 0, // Indicates whether the element is a modal dialog
  'aria-multiline': 0, // Indicates whether the element accepts multiple lines
  'aria-multiselectable': 0, // Indicates whether multiple items can be selected
  'aria-orientation': 0, // Indicates the orientation of the element
  'aria-placeholder': 0, // Defines a placeholder text
  'aria-pressed': 0, // Indicates the state of a toggle button
  'aria-readonly': 0, // Indicates the element is read-only
  'aria-required': 0, // Indicates whether the element is required
  'aria-selected': 0, // Indicates the selection state of an element
  'aria-sort': 0, // Indicates the sort order of columns or rows
  'aria-valuemax': 0, // Defines the maximum value for a range widget
  'aria-valuemin': 0, // Defines the minimum value for a range widget
  'aria-valuenow': 0, // Defines the current value for a range widget
  'aria-valuetext': 0, // Provides a text description of the value

  // Live Region Attributes (for dynamically updated content)
  'aria-atomic': 0, // Indicates whether the entire region is updated
  'aria-busy': 0, // Indicates whether the element or its descendants are being updated
  'aria-live': 0, // Indicates that the element is updated and how to announce it
  'aria-relevant': 0, // Indicates what types of changes to announce

  // Drag-and-Drop Attributes
  'aria-dropeffect': 0, // Indicates what can happen when data is dropped on the element
  'aria-grabbed': 0, // Indicates whether the element can be grabbed

  // Relationship Attributes (for connections between elements)
  'aria-activedescendant': 0, // Identifies the active descendant of the element
  'aria-colcount': 0, // Defines the total number of columns in a table-like structure
  'aria-colindex': 0, // Defines the index of a column
  'aria-colspan': 0, // Defines the number of columns spanned by a cell
  'aria-controls': 0, // Identifies elements controlled by this element
  'aria-describedby': 0, // Identifies elements that describe this element
  'aria-errormessage': 0, // Identifies elements that provide error messages
  'aria-flowto': 0, // Identifies the next element in a flow
  'aria-labelledby': 0, // Identifies elements that label this element
  'aria-owns': 0, // Identifies elements owned by this element
  'aria-posinset': 0, // Defines the position of the element in a set
  'aria-rowcount': 0, // Defines the total number of rows in a table-like structure
  'aria-rowindex': 0, // Defines the index of a row
  'aria-rowspan': 0, // Defines the number of rows spanned by a cell
  'aria-setsize': 0, // Defines the size of a set

  // ARIA 1.3 Attributes (added in ARIA 1.3 specification)
  // https://www.w3.org/TR/wai-aria-1.3/#aria-1.3-attributes
  'aria-braillelabel': 0, // Provides a braille label for the element
  'aria-brailleroledescription': 0, // Provides a braille description of the element's role
  'aria-colindextext': 0, // Provides a text alternative for the column index
  'aria-rowindextext': 0, // Provides a text alternative for the row index
};

export default ariaProperties;
