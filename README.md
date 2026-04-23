# Assay Plotter

A professional tool for generating high-quality dose-response curves and IC50 analysis for biochemical assays.

## Overview
This repository contains tools for visualizing and analyzing assay data, supporting both interactive Jupyter notebooks and standalone Python execution.

## Project Structure
- `assay_plotter.py`: Executable Python script for generating plots with IC50 analysis.
- `assay_plotter.ipynb`: Jupyter Notebook for interactive analysis and visualization.
- `assay-plotter-app/`: A React + Vite web application for browser-based plotting.
- `assay_results.csv`: Sample data file (Vertical format).
- `HRBC Job.csv`: Sample data file (Horizontal/Compound-based format).
- `requirements.txt`: Python dependencies.

## Key Features
- **Dynamic Detection**: Automatically identifies concentration and series columns across different formats.
- **IC50 Analysis**: Calculates and visualizes IC50 values using 4-parameter logistic regression.
- **Multi-Format Support**: Handles both standard vertical layouts and compound-based horizontal layouts.
- **Publication Ready**: Generates high-resolution (300 DPI) plots with professional styling and high-visibility markers.
- **Safe Color Palette**: Uses a professional color palette designed for clarity and scientific publication.

## Supported Assay Types
This tool is generalized for any assay that measures inhibition, activity, or concentration across different points, including:
- **Antioxidant Assays**: DPPH, ABTS, FRAP, etc.
- **Enzyme Inhibition Assays**: Alpha-Glucosidase, Lipase, Tyrosinase, HRBC, etc.
- **Cytotoxicity Assays**: MTT, XTT, etc.

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shrimpyPog/Assay-Plotter.git
   cd Assay-Plotter
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Web Application
1. Navigate to `assay-plotter-app`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### Running the Python Script
The script automatically detects the data format and can be run with optional arguments:
```bash
# Default (uses assay_results.csv)
python assay_plotter.py

# Custom input (output will be auto-named)
python assay_plotter.py "HRBC Job.csv"

# Custom input and output
python assay_plotter.py "data.csv" "my_plot.png"
```

### Running in Jupyter
Open `assay_plotter.ipynb` and run the cells. It includes logic to handle both standard vertical layouts and compound-based horizontal layouts with interactive feedback.

### Using the Web App
Upload your `.csv` file directly to the web interface to visualize and download your plots.

## Supported Data Formats
The tool supports two primary CSV structures:

### 1. Vertical Format (Standard)
Columns represent different samples/standards:
- `Mass (ug)` or concentration on the X-axis.
- Columns like `Std Inhibition%`, `RCE inhibition%`, etc., as Y-axis series.

### 2. Horizontal Format (Compound-based)
Rows represent different compounds:
- A `Compound` column for sample names.
- Columns named by concentration (e.g., `125 µM (%)`, `250 µM (%)`) as X-axis points.

## Output
- `[filename]_plot.png`: A 300 DPI high-resolution image file suitable for publication.
