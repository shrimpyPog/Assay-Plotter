import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

def generate_assay_plot(csv_path='assay_results.csv', output_path='assay_plot.png'):
    """
    Generates a line-and-scatter plot for various assay results.
    Support dynamic number of samples and generalized labeling.
    """
    # Load the data
    try:
        # Read the CSV file
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: {csv_path} not found.")
        return

    # CLEANING: Remove any leading/trailing whitespace from column names to prevent KeyErrors
    df.columns = df.columns.str.strip()

    # Set the style (Professional, scientific look)
    sns.set_theme(style="whitegrid", font_scale=1.2)
    plt.figure(figsize=(12, 8))

    # Identify columns dynamically
    # First column is usually concentration, but we'll try to find 'Mass (ug)'
    col_x = 'Mass (ug)' if 'Mass (ug)' in df.columns else df.columns[0]
    
    # Identify standard and samples
    # 'Std Inhibition%' is the standard. Others are samples.
    # If 'Std Inhibition%' is not found, we'll assume the second column is the standard.
    col_std = None
    sample_cols = []
    
    for col in df.columns:
        if col == col_x:
            continue
        if 'std' in col.lower() or 'standard' in col.lower() or 'inhibition%' in col.lower() and col_std is None:
            col_std = col
        else:
            sample_cols.append(col)

    # If col_std was not found, take the first non-X column as standard if there are others
    if col_std is None and len(df.columns) > 1:
        col_std = [c for c in df.columns if c != col_x][0]
        sample_cols = [c for c in df.columns if c != col_x and c != col_std]

    # Professional color palette (Avoiding maroon, red, and black)
    # Using a variety of distinct colors
    colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4f46e5', '#ca8a04']
    markers = ['o', 's', '^', 'D', 'v', 'p', '*', 'h']

    try:
        # Plot Standard
        if col_std:
            plt.plot(df[col_x], df[col_std], 
                     label=f'Standard ({col_std})', color=colors[0], marker=markers[0], 
                     linestyle='-', linewidth=2.5, markersize=8)

        # Plot Samples
        for i, col in enumerate(sample_cols):
            # Use colors from index 1 onwards for samples, wrap around if needed
            color_idx = (i + 1) % len(colors)
            marker_idx = (i + 1) % len(markers)
            
            plt.plot(df[col_x], df[col], 
                     label=f'Sample: {col}', color=colors[color_idx], marker=markers[marker_idx], 
                     linestyle='-', linewidth=2, markersize=8)

        # Axis labels and titles (Generalized)
        plt.xlabel(f'Concentration ({col_x})', fontweight='bold')
        plt.ylabel('Inhibition (%)', fontweight='bold')
        plt.title('Assay Dose-Response Results', fontweight='bold', pad=20)

        # Replicate high-quality grid and border
        plt.gca().spines['top'].set_visible(True)
        plt.gca().spines['right'].set_visible(True)
        plt.gca().spines['left'].set_linewidth(1.5)
        plt.gca().spines['bottom'].set_linewidth(1.5)
        plt.gca().spines['top'].set_linewidth(1.5)
        plt.gca().spines['right'].set_linewidth(1.5)

        # Grid styling
        plt.grid(True, which='both', linestyle='--', alpha=0.6, linewidth=0.7)

        # Legend placement (Bottom Center to avoid overlap with curves)
        plt.legend(loc='upper center', bbox_to_anchor=(0.5, -0.18), 
                   frameon=True, shadow=True, borderpad=1, ncol=2)

        # Ensure Y-axis starts from 0 or slightly below
        plt.ylim(-5, 105)

        # Save high-resolution plot
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        # plt.show() # Uncomment if running interactively
        print(f"Successfully saved high-resolution plot to {output_path}")
        print(f"Mapped Standard to: {col_std}")
        print(f"Mapped Samples to: {', '.join(sample_cols)}")
        
    except KeyError as e:
        print(f"Error: Column {e} not found in your data.")
        print("Available columns are:", df.columns.tolist())
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    generate_assay_plot()
