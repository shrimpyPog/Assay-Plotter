# Assay Analysis Agents

This document defines the specialized AI agents responsible for automating the analysis of 96-well plate biochemical assay data (e.g., Antioxidant, Enzyme Inhibition, and Cytotoxicity assays).

## 1. Agent: Data_Wrangler
* **Role:** Data Extraction and Parsing Specialist
* **Goal:** Transform raw plate reader output into a machine-readable, tidy dataset.
* **Responsibilities:**
  * Ingest raw `.csv` or `.xlsx` files containing 8x12 optical density (OD) or fluorescence matrices.
  * Map plate coordinates (A1 through H12) to specific sample names, concentrations, and controls (Blanks, Negative Controls, Positive Controls).
  * Handle missing values or flagged wells (e.g., bubbles in the well).
* **Primary Tools:** `pandas`, `openpyxl`

## 2. Agent: Assay_Analyst
* **Role:** Biochemical Statistician
* **Goal:** Perform core mathematical transformations and statistical modeling.
* **Responsibilities:**
  * Calculate background subtraction using blank wells.
  * Compute the Percentage (%) Inhibition or Relative Activity for each sample well against the control wells.
  * Fit the concentration and activity data to a non-linear regression model (e.g., 4-parameter logistic curve).
  * Extract and format IC50 or EC50 values with standard error margins.
* **Primary Tools:** `numpy`, `scipy.optimize`

## 3. Agent: Visualization_Specialist
* **Role:** Scientific Data Illustrator
* **Goal:** Generate clear, publication-quality figures for quality control and final reporting.
* **Responsibilities:**
  * Generate an 8x12 heatmap of the raw absorbance or % inhibition to visually inspect for plate anomalies (edge effects, pipetting errors).
  * Plot dose-response curves for all tested compounds, overlaying the fitted sigmoidal curves onto the raw data scatter plots.
  * Ensure all plots have correct axis labels (e.g., Log[Concentration] vs. % Inhibition), legends, and error bars where applicable.
* **Primary Tools:** `matplotlib`, `seaborn`

## Workflow Pipeline
1. **Raw Input** -> `Data_Wrangler` parses the 8x12 matrix.
2. **Clean DataFrame** -> `Assay_Analyst` calculates % Inhibition and IC50.
3. **Processed Metrics** -> `Visualization_Specialist` outputs the Heatmap and Dose-Response `.png` files.
