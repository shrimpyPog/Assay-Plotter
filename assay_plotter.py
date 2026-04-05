import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

def generate_assay_plot(csv_path='assay_results.csv', output_path='assay_plot.png'):
    """
    Generates a line-and-scatter plot for various assay results.
    """
    # Load the data
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
        return

    # CLEANING: Remove any leading/trailing whitespace from column names to prevent KeyErrors
    df.columns = df.columns.str.strip()

    # Set the style (Professional, scientific look)
    sns.set_theme(style="whitegrid", font_scale=1.2)
    plt.figure(figsize=(10, 7))

    # Configuration: Map your actual CSV column names here if they differ
    col_x = 'Mass (ug)'
    col_std = 'Std Inhibition%'
    col_rce = 'RCE inhibition%'
    col_cae = 'CAE %inhibition'

    try:
        # Plot configuration
        # Series 1: Standard
        plt.plot(df[col_x], df[col_std], 
                 label='Standard', color='blue', marker='o', 
                 linestyle='-', linewidth=2, markersize=8)

        # Series 2: Sample RCE
        plt.plot(df[col_x], df[col_rce], 
                 label='Sample RCE', color='red', marker='s', 
                 linestyle='-', linewidth=2, markersize=8)

        # Series 3: Sample CAE
        plt.plot(df[col_x], df[col_cae], 
                 label='Sample CAE', color='green', marker='^', 
                 linestyle='-', linewidth=2, markersize=8)

        # Axis labels and titles
        plt.xlabel('Concentration (µg)', fontweight='bold')
        plt.ylabel('% Inhibition', fontweight='bold')
        plt.title('Assay Inhibition Results', fontweight='bold', pad=20)

        # Replicate high-quality grid and border
        plt.gca().spines['top'].set_visible(True)
        plt.gca().spines['right'].set_visible(True)
        plt.gca().spines['left'].set_linewidth(1.5)
        plt.gca().spines['bottom'].set_linewidth(1.5)
        plt.gca().spines['top'].set_linewidth(1.5)
        plt.gca().spines['right'].set_linewidth(1.5)

        # Grid styling
        plt.grid(True, which='both', linestyle='--', alpha=0.6, linewidth=0.7)

        # Legend placement (Top Left as is common in these assays)
        plt.legend(loc='upper left', frameon=True, shadow=True, borderpad=1)

        # Ensure Y-axis starts from 0 or slightly below
        plt.ylim(-5, 105)

        # Save high-resolution plot
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.show()
        print(f"Successfully saved high-resolution plot to {output_path}")
    except KeyError as e:
        print(f"Error: Column {e} not found in your data.")
        print("Available columns are:", df.columns.tolist())

if __name__ == "__main__":
    generate_assay_plot()
