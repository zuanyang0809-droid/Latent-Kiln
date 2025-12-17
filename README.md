# LATENT KILN: The Machinic Curator

> **"Unearthing the morphological universe of ceramics through the lens of machine vision."**
[Latent Kiln try it](https://zuanyang0809-droid.github.io/Latent-Kiln/)

## 📖 Abstract

Traditional museum catalogs are static lists, flattening cultural artifacts into mere 2D images. **Latent Kiln** reimagines the archive as a dynamic, living system. 

By training four distinct neural networks to perceive **texture, silhouette, mass, and volume**, we have transformed a dataset of thousands of ceramic vases (sourced from the V&A Museum) into a navigable **"Morphological Globe."** This project bridges the gap between the static archive and generative creation, allowing users to explore history not by date, but by form.

---

## 🧠 The Computational Pipeline (Backend)

This project is powered by a custom multi-modal machine learning pipeline developed in **Python**.

### 1. Data Mining & Preprocessing
*   **Source:** Aggregated 4,000+ images via the **Victoria and Albert Museum (V&A) API**.
*   **Cleaning:** Automated "Pseudo-labeling" using a pre-trained classifier to sort the massive unlabelled archive.
*   **Processing:** Automated background removal (`rembg`) and edge detection (`Canny`) to prepare clean datasets.

### 2. The 4 Perceptual Models
We trained four separate ResNet-18 classifiers to analyze artifacts from different aesthetic dimensions:
1.  **📸 Photo Model:** Analyzes color, texture, and surface materiality.
2.  **✏ Edge Model:** Analyzes pure silhouette and shape (used for sketch-to-search).
3.  **🌗 Grayscale Model:** Analyzes lighting and structure, ignoring glaze colors.
4.  **🧊 Depth Model:** Analyzes 3D volumetric topology and massing.

### 3. Asset Generation
*   **Volumetric Reconstruction:** Generated high-quality grayscale Depth Maps using **ZoeDepth** for 2.5D web visualization.
*   **Morphological Segmentation:** Developed a "Human-in-the-loop" interactive slicer to decons
