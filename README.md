# Assay Plotting Tool

This repository contains tools for visualizing various biochemical assay results (e.g., DPPH, ABTS, FRAP, Alpha-Glucosidase, etc.) using Python. It generates high-resolution, publication-ready line-and-scatter plots.

## Project Structure
- `assay_plotter.py`: Executable Python script for generating plots.
- `assay_plotter.ipynb`: Jupyter Notebook for interactive analysis.
- `assay_results.csv`: Sample data file (contains columns for Standard, RCE, and CAE).
- `requirements.txt`: Python dependencies.

## Supported Assay Types
This tool is generalized for any assay that measures inhibition, activity, or concentration across different mass/volume points, including:
- **Antioxidant Assays**: DPPH, ABTS, FRAP, etc.
- **Enzyme Inhibition Assays**: Alpha-Glucosidase, Lipase, Tyrosinase, etc.
- **Cytotoxicity Assays**: MTT, XTT, etc.

## Setup
1. Ensure you have Python installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage
### Running in Jupyter (Recommended)
Open `assay_plotter.ipynb` and run the cells sequentially. This allows for real-time adjustments to labels and styles.

### Running the Python Script
To generate the plot directly from your terminal:
```bash
python assay_plotter.py
```

## Data Format
The CSV should contain the following columns (default configuration):
- `Mass (ug)`: X-axis values (Concentration/Mass).
- `Std Inhibition%`: Y-axis values for the Standard.
- `RCE inhibition%`: Y-axis values for Sample RCE.
- `CAE %inhibition`: Y-axis values for Sample CAE.

*Note: You can easily map different column names within the configuration section of the script or notebook.*

## Output
- `assay_plot.png`: A 300 DPI high-resolution image file suitable for publication.
