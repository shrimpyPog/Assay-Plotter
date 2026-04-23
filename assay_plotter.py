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
    Generates a line-and-scatter plot with highly visible IC50 analysis.
    Supports both horizontal (compound-based) and vertical (standard) CSV formats.
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

    # CLEANING: Remove any leading/trailing whitespace from column names
    df.columns = df.columns.str.strip()
    df = df.dropna(how='all').dropna(axis=1, how='all')

    # Palette excluding restricted colors
    custom_colors = ['#FF8C00', '#00CED1', '#FF1493', '#000000', '#FF4500', '#008B8B', '#2563eb', '#16a34a']

    sns.set_theme(style="whitegrid", font_scale=1.2)
    fig, ax = plt.subplots(figsize=(12, 8))

    ic50_results = []
    y_limit_bottom = -10
    y_limit_top = 110

    try:
        if 'Compound' in df.columns:
            # Horizontal Format
            value_cols = [c for c in df.columns if c != 'Compound']
            x_numeric = np.array([float(re.search(r'(\d+)', c).group(1)) if re.search(r'(\d+)', c) else c for c in value_cols])
            x_smooth = np.linspace(min(x_numeric), max(x_numeric), 300)

            for i, (_, row) in enumerate(df.iterrows()):
                name = str(row['Compound']).strip()
                if not name or name == 'nan': continue
                y_val = row[value_cols].values.astype(float)
                color = custom_colors[i % len(custom_colors)]

                ic50, popt = calculate_ic50(x_numeric, y_val)
                ax.scatter(x_numeric, y_val, color=color, s=100, edgecolors='white', zorder=5)

                if popt is not None:
                    ax.plot(x_smooth, logistic4(x_smooth, *popt), color=color, label=name, linewidth=3, zorder=4)
                    if ic50 and min(x_numeric) <= ic50 <= max(x_numeric):
                        ic50_results.append((name, ic50, color))
                else:
                    try:
                        spline = make_interp_spline(x_numeric, y_val, k=2)
                        ax.plot(x_smooth, spline(x_smooth), color=color, label=name, linewidth=2, alpha=0.7, zorder=4)
                    except:
                        ax.plot(x_numeric, y_val, color=color, label=name, linewidth=2, alpha=0.7, zorder=4)  
            plt.xlabel('Concentration', fontweight='bold')

        else:
            # Vertical Format
            # Identify columns dynamically
            col_x = 'Mass (ug)' if 'Mass (ug)' in df.columns else df.columns[0]
            x_data = df[col_x].values
            x_smooth = np.linspace(min(x_data), max(x_data), 300)
            
            # Identify data columns (all except X)
            data_cols = [c for c in df.columns if c != col_x]
            
            for i, col in enumerate(data_cols):
                y_data = df[col].values
                color = custom_colors[i % len(custom_colors)]
                label = col
                
                ic50, popt = calculate_ic50(x_data, y_data)
                ax.scatter(x_data, y_data, color=color, s=100, edgecolors='white', zorder=5)

                if popt is not None:
                    ax.plot(x_smooth, logistic4(x_smooth, *popt), color=color, label=label, linewidth=3, zorder=4)
                    if ic50 and min(x_data) <= ic50 <= max(x_data):
                        ic50_results.append((label, ic50, color))
                else:
                    try:
                        spline = make_interp_spline(x_data, y_data, k=2)
                        ax.plot(x_smooth, spline(x_smooth), color=color, label=label, linewidth=2, alpha=0.7, zorder=4)
                    except:
                        ax.plot(x_data, y_data, color=color, label=label, linewidth=2, alpha=0.7, zorder=4)
            
            plt.xlabel(f'Concentration ({col_x})', fontweight='bold')

        # ENHANCED VISIBILITY FOR IC50 LINES
        ax.axhline(50, color='black', linestyle='--', linewidth=1.5, alpha=0.5, zorder=1)

        for name, ic50, color in ic50_results:
            # Draw vertical dashed line (highly visible)
            ax.vlines(x=ic50, ymin=y_limit_bottom, ymax=50, colors=color, linestyles='--', linewidth=2.5, zorder=6)
            # Intersection point marker
            ax.plot(ic50, 50, marker='o', color='white', markeredgecolor=color, markersize=10, markeredgewidth=2, zorder=7)
            # X-axis label for the IC50 value
            ax.text(ic50, y_limit_bottom + 2, f'{ic50:.1f}', color=color, fontweight='bold',
                    ha='center', va='bottom', fontsize=10, bbox=dict(facecolor='white', alpha=0.7, edgecolor='none', pad=1))

        # Summary Table
        if ic50_results:
            summary = "IC50 Values:\n" + "\n".join([f"{n}: {ic:.2f}" for n, ic, c in ic50_results])
            ax.text(0.98, 0.02, summary, transform=ax.transAxes, fontsize=12, fontweight='bold',
                    bbox=dict(boxstyle='round,pad=0.5', facecolor='white', alpha=0.9, edgecolor='darkgrey'),  
                    verticalalignment='bottom', horizontalalignment='right', family='monospace')

        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True, shadow=True, borderpad=1)        
        plt.ylabel('% Inhibition', fontweight='bold')
        plt.title('Assay Dose-Response Analysis', fontweight='bold', pad=25, fontsize=16)
        plt.ylim(y_limit_bottom, y_limit_top)

        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"High-visibility plot saved to {output_path}")

    except Exception as e:
        print(f"Plotting error: {e}")

if __name__ == "__main__":
    input_f = sys.argv[1] if len(sys.argv) > 1 else 'assay_results.csv'
    generate_assay_plot(input_f)
