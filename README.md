# Assay Plotting Tool

This repository contains tools for visualizing various biochemical assay results (e.g., DPPH, ABTS, FRAP, Alpha-Glucosidase, etc.) using Python and a web-based React application. It generates high-resolution, publication-ready line-and-scatter plots.

## Project Structure
- `assay_plotter.py`: Executable Python script for generating plots.
- `assay_plotter.ipynb`: Jupyter Notebook for interactive analysis.
- `assay-plotter-app/`: A React + Vite web application for browser-based plotting.
- `assay_results.csv`: Sample data file.
- `requirements.txt`: Python dependencies.

## Key Features
- **Dynamic Detection**: Automatically identifies concentration and standard columns.
- **Multi-Sample Support**: Handles any number of samples in a single CSV file.
- **Publication Ready**: Generates high-resolution (300 DPI) plots with professional styling.
- **Safe Color Palette**: Uses a distinct, professional color palette that avoids red, maroon, and black for better clarity.

## Supported Assay Types
This tool is generalized for any assay that measures inhibition, activity, or concentration across different mass/volume points, including:
- **Antioxidant Assays**: DPPH, ABTS, FRAP, etc.
- **Enzyme Inhibition Assays**: Alpha-Glucosidase, Lipase, Tyrosinase, etc.
- **Cytotoxicity Assays**: MTT, XTT, etc.

## Setup
### Python Environment
1. Ensure you have Python installed.
2. Install dependencies:
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
### Running in Jupyter (Recommended)
Open `assay_plotter.ipynb` and run the cells sequentially. This allows for real-time adjustments to labels and styles.

### Running the Python Script
To generate the plot directly from your terminal:
```bash
python assay_plotter.py
```

### Using the Web App
Upload your `.csv` file directly to the web interface to visualize and download your plots.

## Data Format
The CSV should contain at least:
- **Concentration Column**: e.g., `Mass (ug)`, `Concentration`, `X`.
- **Standard Column**: e.g., `Std Inhibition%`, `Standard`, `Control`.
- **Sample Columns**: Any number of additional columns representing different samples.

## Output
- `assay_plot.png`: A 300 DPI high-resolution image file suitable for publication.
