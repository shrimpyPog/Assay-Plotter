# Assay Analysis Agents

This document defines the specialized AI agents responsible for automating the analysis of biochemical assay data.

## 1. Agent: Data_Wrangler
* **Role:** Data Extraction and Parsing Specialist
* **Goal:** Transform raw assay output into a machine-readable, tidy dataset.
* **Responsibilities:**
  * Ingest `.csv` or `.xlsx` files with flexible layouts.
  * **Support for Dual Layouts:** Handle both vertical (Concentration as column) and horizontal (Compound as row) data structures.
  * **Robust Parsing:** Automatically handle multiple file encodings (UTF-8, Latin-1) and sanitize column names (strip whitespace, handle special characters like µ).
  * Map coordinates or compound names to specific concentrations and activity metrics.
* **Primary Tools:** `pandas`, `openpyxl`, `re`

## 2. Agent: Assay_Analyst
* **Role:** Biochemical Statistician
* **Goal:** Perform core mathematical transformations and statistical modeling.
* **Responsibilities:**
  * Calculate background subtraction using blank wells.
  * Compute Percentage (%) Inhibition or Relative Activity.
  * Fit data to non-linear regression models (e.g., IC50 calculation).
* **Primary Tools:** `numpy`, `scipy.optimize`

## 3. Agent: Visualization_Specialist
* **Role:** Scientific Data Illustrator
* **Goal:** Generate clear, publication-quality figures.
* **Responsibilities:**
  * **Automated Plotting:** Detect data layout and dynamically generate series for multiple compounds or standards.
  * **Concentration Extraction:** Parse numeric concentrations from string headers (e.g., "125 µM (%)" -> 125).
  * Ensure high-resolution output (300 DPI) with standardized scientific styling, legends, and axis labeling.
* **Primary Tools:** `matplotlib`, `seaborn`

## Workflow Pipeline
1. **Raw Input** -> `Data_Wrangler` parses the layout and cleans the data.
2. **Clean DataFrame** -> `Assay_Analyst` calculates metrics.
3. **Processed Metrics** -> `Visualization_Specialist` outputs high-resolution `.png` files.
