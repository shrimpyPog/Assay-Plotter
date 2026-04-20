import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import re
import sys
import os
from scipy.optimize import curve_fit
from scipy.interpolate import make_interp_spline

def logistic4(x, a, b, c, d):
    """4-Parameter Logistic Curve for IC50 fitting."""
    return d + (a - d) / (1 + (x / c)**b)

def calculate_ic50(x_data, y_data):
    """Calculates IC50 using 4PL regression."""
    try:
        p0 = [min(y_data), 1, np.median(x_data), max(y_data)]
        popt, _ = curve_fit(logistic4, x_data, y_data, p0=p0, maxfev=20000)
        a, b, c, d = popt
        # Solve for x where y = 50
        if (a-d) != 0:
            val = (a - d) / (50 - d) - 1
            if val > 0:
                ic50 = c * (val**(1/b))
                return ic50, popt
        return None, None
    except:
        return None, None

def generate_assay_plot(csv_path='assay_results.csv', output_path=None):
    """
    Generates a line-and-scatter plot with IC50 analysis.
    Ensures high visibility of reference lines.
    """
    if output_path is None:
        base_name = os.path.splitext(csv_path)[0]
        output_path = f"{base_name}_plot.png"

    try:
        try:
            df = pd.read_csv(csv_path)
        except UnicodeDecodeError:
            df = pd.read_csv(csv_path, encoding='latin-1')
    except Exception as e:
        print(f"Error loading {csv_path}: {e}")
        return

    df.columns = df.columns.str.strip()
    df = df.dropna(how='all').dropna(axis=1, how='all')

    # Color Palette (Avoiding restricted colors)
    custom_colors = ['#FF8C00', '#00CED1', '#FF1493', '#000000', '#FF4500', '#008B8B']
    
    sns.set_theme(style="whitegrid", font_scale=1.2)
    fig, ax = plt.subplots(figsize=(12, 7))

    ic50_results = []
    y_min, y_max = -5, 110

    try:
        if 'Compound' in df.columns:
            value_cols = [c for c in df.columns if c != 'Compound']
            x_numeric = np.array([float(re.search(r'(\d+)', c).group(1)) if re.search(r'(\d+)', c) else c for c in value_cols])
            x_smooth = np.linspace(min(x_numeric), max(x_numeric), 300)
            
            for i, (_, row) in enumerate(df.iterrows()):
                name = str(row['Compound']).strip()
                if not name or name == 'nan': continue
                
                y_val = row[value_cols].values.astype(float)
                color = custom_colors[i % len(custom_colors)]
                
                ic50, popt = calculate_ic50(x_numeric, y_val)
                ax.scatter(x_numeric, y_val, color=color, s=80, edgecolors='white', zorder=5)
                
                if popt is not None:
                    ax.plot(x_smooth, logistic4(x_smooth, *popt), color=color, label=name, linewidth=2.5, zorder=4)
                    if ic50 and min(x_numeric) <= ic50 <= max(x_numeric):
                        ic50_results.append((name, ic50, color))
                else:
                    try:
                        spline = make_interp_spline(x_numeric, y_val, k=2)
                        ax.plot(x_smooth, spline(x_smooth), color=color, label=name, linewidth=2, alpha=0.7, zorder=4)
                    except:
                        ax.plot(x_numeric, y_val, color=color, label=name, linewidth=2, alpha=0.7, zorder=4)
            
            plt.xlabel('Concentration', fontweight='bold')
            
        elif 'Mass (ug)' in df.columns:
            col_x = 'Mass (ug)'
            x_data = df[col_x].values
            x_smooth = np.linspace(min(x_data), max(x_data), 300)
            mapping = {'Std Inhibition%': 'Standard', 'RCE inhibition%': 'Sample RCE', 'CAE %inhibition': 'Sample CAE'}
            
            for i, (col, label) in enumerate(mapping.items()):
                if col in df.columns:
                    y_data = df[col].values
                    color = custom_colors[i % len(custom_colors)]
                    
                    ic50, popt = calculate_ic50(x_data, y_data)
                    ax.scatter(x_data, y_data, color=color, s=80, edgecolors='white', zorder=5)
                    
                    if popt is not None:
                        ax.plot(x_smooth, logistic4(x_smooth, *popt), color=color, label=label, linewidth=2.5, zorder=4)
                        if ic50 and min(x_data) <= ic50 <= max(x_data):
                            ic50_results.append((label, ic50, color))
                    else:
                        try:
                            spline = make_interp_spline(x_data, y_data, k=2)
                            ax.plot(x_smooth, spline(x_smooth), color=color, label=label, linewidth=2, alpha=0.7, zorder=4)
                        except:
                            ax.plot(x_data, y_data, color=color, label=label, linewidth=2, alpha=0.7, zorder=4)
            
            plt.xlabel('Concentration (µg)', fontweight='bold')

        # REFERENCE LINES - HIGH VISIBILITY
        # Horizontal 50% line
        ax.axhline(50, color='black', linestyle='--', linewidth=1, alpha=0.4, zorder=1)
        ax.text(ax.get_xlim()[0], 51, ' 50%', color='black', alpha=0.6, fontsize=10, fontweight='bold')

        # Vertical IC50 lines using absolute data coordinates
        for name, ic50, color in ic50_results:
            ax.plot([ic50, ic50], [y_min, 50], color=color, linestyle=':', linewidth=2, alpha=1, zorder=6)
            ax.plot(ic50, 50, marker='o', color='white', markeredgecolor=color, markersize=8, zorder=7)

        # Summary Panel
        if ic50_results:
            summary = "Calculated IC50:\n" + "\n".join([f"{n}: {ic:.2f}" for n, ic, c in ic50_results])
            ax.text(0.98, 0.02, summary, transform=ax.transAxes, fontsize=11, fontweight='bold',
                    bbox=dict(boxstyle='round', facecolor='white', alpha=0.9, edgecolor='lightgrey'),
                    verticalalignment='bottom', horizontalalignment='right', family='monospace')

        # Legend: Outside
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True, shadow=True, borderpad=1)
        
        plt.ylabel('% Inhibition', fontweight='bold')
        plt.title('Assay Dose-Response Analysis', fontweight='bold', pad=20)
        plt.ylim(y_min, y_max)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"Successfully saved plot to {output_path}")

    except Exception as e:
        print(f"Plotting error: {e}")

if __name__ == "__main__":
    input_f = sys.argv[1] if len(sys.argv) > 1 else 'assay_results.csv'
    generate_assay_plot(input_f)
