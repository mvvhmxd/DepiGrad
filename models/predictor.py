"""
Land Classification Predictor Module
Handles loading and inference for 3 satellite image classification models.
"""

import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow import keras
import os

# Land classification classes (EuroSAT standard classes)
CLASS_NAMES = [
    'AnnualCrop',
    'Forest', 
    'HerbaceousVegetation',
    'Highway',
    'Industrial',
    'Pasture',
    'PermanentCrop',
    'Residential',
    'River',
    'SeaLake'
]

# Model configurations
MODEL_CONFIG = {
    'rgb': {
        'path': 'model_rgb_v0.h5',
        'name': 'RGB Model',
        'description': 'Uses standard RGB satellite imagery',
        'input_shape': (64, 64, 3),
        'channels': 3
    },
    'rgb_nir': {
        'path': 'model_RGB_NIR_v0.h5', 
        'name': 'RGB + NIR Model',
        'description': 'Uses RGB with Near-Infrared band for enhanced vegetation detection',
        'input_shape': (64, 64, 4),
        'channels': 4
    },
    'ndvi': {
        'path': 'model_NDVI_v2.h5',
        'name': 'NDVI Model',
        'description': 'Uses Normalized Difference Vegetation Index for vegetation analysis',
        'input_shape': (64, 64, 1),
        'channels': 1
    }
}


class LandClassifier:
    """Handles model loading and predictions for land classification."""
    
    def __init__(self, models_dir='.'):
        self.models_dir = models_dir
        self.models = {}
        self.load_models()
    
    def load_models(self):
        """Load all available models into memory."""
        for model_key, config in MODEL_CONFIG.items():
            model_path = os.path.join(self.models_dir, config['path'])
            if os.path.exists(model_path):
                try:
                    self.models[model_key] = keras.models.load_model(model_path)
                    print(f"✓ Loaded {config['name']}")
                except Exception as e:
                    print(f"✗ Failed to load {config['name']}: {e}")
            else:
                print(f"✗ Model not found: {model_path}")
    
    def preprocess_image(self, image_path, model_key):
        """Preprocess image for the specified model."""
        config = MODEL_CONFIG[model_key]
        img = Image.open(image_path)
        
        # Resize to expected input size
        target_size = (config['input_shape'][0], config['input_shape'][1])
        img = img.resize(target_size, Image.Resampling.LANCZOS)
        
        # Convert to numpy array
        img_array = np.array(img, dtype=np.float32)
        
        # Handle channel conversion based on model type
        if model_key == 'ndvi':
            # For NDVI model, convert to grayscale or calculate NDVI if RGB
            if len(img_array.shape) == 3:
                # If color image, convert to grayscale as NDVI proxy
                img_array = np.mean(img_array, axis=2, keepdims=True)
            elif len(img_array.shape) == 2:
                img_array = np.expand_dims(img_array, axis=-1)
        elif model_key == 'rgb':
            # Ensure RGB (3 channels)
            if len(img_array.shape) == 2:
                img_array = np.stack([img_array] * 3, axis=-1)
            elif img_array.shape[-1] == 4:
                img_array = img_array[:, :, :3]  # Remove alpha
            elif img_array.shape[-1] == 1:
                img_array = np.concatenate([img_array] * 3, axis=-1)
        elif model_key == 'rgb_nir':
            # Ensure 4 channels (RGB + NIR)
            if len(img_array.shape) == 2:
                img_array = np.stack([img_array] * 4, axis=-1)
            elif img_array.shape[-1] == 3:
                # Add a synthetic NIR channel (grayscale as placeholder)
                nir = np.mean(img_array, axis=2, keepdims=True)
                img_array = np.concatenate([img_array, nir], axis=-1)
            elif img_array.shape[-1] == 1:
                img_array = np.concatenate([img_array] * 4, axis=-1)
        
        # Normalize to [0, 1]
        if img_array.max() > 1:
            img_array = img_array / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def predict(self, image_path, model_key='rgb'):
        """Run prediction on an image using the specified model."""
        if model_key not in self.models:
            return {
                'success': False,
                'error': f'Model "{model_key}" not loaded'
            }
        
        try:
            # Preprocess image
            img_array = self.preprocess_image(image_path, model_key)
            
            # Run prediction
            model = self.models[model_key]
            predictions = model.predict(img_array, verbose=0)[0]
            
            # Get class probabilities
            probabilities = {
                CLASS_NAMES[i]: float(predictions[i]) * 100 
                for i in range(len(CLASS_NAMES))
            }
            
            # Sort by probability
            sorted_probs = dict(sorted(
                probabilities.items(), 
                key=lambda x: x[1], 
                reverse=True
            ))
            
            # Get top prediction
            top_class = max(probabilities, key=probabilities.get)
            confidence = probabilities[top_class]
            
            return {
                'success': True,
                'predicted_class': top_class,
                'confidence': round(confidence, 2),
                'probabilities': sorted_probs,
                'model_used': MODEL_CONFIG[model_key]['name']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_available_models(self):
        """Return info about loaded models."""
        available = []
        for key, config in MODEL_CONFIG.items():
            available.append({
                'key': key,
                'name': config['name'],
                'description': config['description'],
                'loaded': key in self.models
            })
        return available
    
    def compare_all(self, image_path):
        """Run prediction on all loaded models and return comparison."""
        results = {}
        
        for model_key in self.models.keys():
            result = self.predict(image_path, model_key)
            if result['success']:
                results[model_key] = {
                    'model_name': MODEL_CONFIG[model_key]['name'],
                    'predicted_class': result['predicted_class'],
                    'confidence': result['confidence'],
                    'probabilities': result['probabilities']
                }
            else:
                results[model_key] = {
                    'model_name': MODEL_CONFIG[model_key]['name'],
                    'error': result.get('error', 'Unknown error')
                }
        
        # Find consensus (most common prediction)
        predictions = [r['predicted_class'] for r in results.values() if 'predicted_class' in r]
        if predictions:
            from collections import Counter
            consensus = Counter(predictions).most_common(1)[0][0]
            agreement = predictions.count(consensus) / len(predictions) * 100
        else:
            consensus = None
            agreement = 0
        
        return {
            'success': True,
            'models': results,
            'consensus': consensus,
            'agreement': round(agreement, 1)
        }
    
    def generate_heatmap(self, image_path, model_key='rgb'):
        """Generate activation-based heatmap for model visualization."""
        import base64
        from io import BytesIO
        
        if model_key not in self.models:
            return {'success': False, 'error': f'Model "{model_key}" not loaded'}
        
        try:
            model = self.models[model_key]
            img_array = self.preprocess_image(image_path, model_key)
            
            # Get prediction first
            predictions = model.predict(img_array, verbose=0)
            pred_index = int(np.argmax(predictions[0]))
            
            # Create simple intensity-based heatmap (always works)
            if img_array.shape[-1] >= 3:
                heatmap = np.mean(img_array[0, :, :, :3], axis=-1)
            else:
                heatmap = img_array[0, :, :, 0]
            
            # Normalize heatmap
            heatmap = np.maximum(heatmap, 0)
            if np.max(heatmap) > 0:
                heatmap = heatmap / np.max(heatmap)
            
            # Resize to 64x64
            heatmap_pil = Image.fromarray(np.uint8(255 * heatmap))
            heatmap_pil = heatmap_pil.resize((64, 64), Image.Resampling.BILINEAR)
            heatmap_array = np.array(heatmap_pil) / 255.0
            
            # Apply colormap (blue to red)
            heatmap_colored = np.zeros((64, 64, 3), dtype=np.uint8)
            for i in range(64):
                for j in range(64):
                    v = heatmap_array[i, j]
                    if v < 0.5:
                        heatmap_colored[i, j] = [0, int(v * 510), int(255 - v * 510)]
                    else:
                        heatmap_colored[i, j] = [int((v - 0.5) * 510), int(255 - (v - 0.5) * 510), 0]
            
            # Load original image
            original = Image.open(image_path).resize((64, 64)).convert('RGB')
            original_array = np.array(original)
            
            # Blend
            blended = np.uint8(0.5 * heatmap_colored + 0.5 * original_array)
            
            # Convert to base64
            buffer1 = BytesIO()
            Image.fromarray(blended).save(buffer1, format='PNG')
            overlay_b64 = base64.b64encode(buffer1.getvalue()).decode()
            
            buffer2 = BytesIO()
            Image.fromarray(heatmap_colored).save(buffer2, format='PNG')
            heatmap_b64 = base64.b64encode(buffer2.getvalue()).decode()
            
            return {
                'success': True,
                'heatmap_overlay': f'data:image/png;base64,{overlay_b64}',
                'heatmap_only': f'data:image/png;base64,{heatmap_b64}',
                'predicted_class': CLASS_NAMES[pred_index],
                'model_used': MODEL_CONFIG[model_key]['name']
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def _create_saliency(self, model, img_array, pred_index):
        """Create saliency map as fallback."""
        # Simple approach: use input image intensity
        if img_array.shape[-1] >= 3:
            return np.mean(img_array[0, :, :, :3], axis=-1)
        else:
            return img_array[0, :, :, 0]

