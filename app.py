"""
Land Classification Web Application
Flask-based dashboard for satellite image classification with 3 ML models.
"""

from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
from models.predictor import LandClassifier, CLASS_NAMES, MODEL_CONFIG

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tif', 'tiff'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize classifier (loads all models)
print("\n🛰️  Loading Land Classification Models...")
classifier = LandClassifier(models_dir='.')
print("✓ Models ready!\n")


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Render main dashboard."""
    models = classifier.get_available_models()
    return render_template('index.html', models=models, classes=CLASS_NAMES)


@app.route('/models', methods=['GET'])
def get_models():
    """Return available models information."""
    return jsonify({
        'success': True,
        'models': classifier.get_available_models()
    })


@app.route('/predict', methods=['POST'])
def predict():
    """Handle image upload and prediction."""
    # Check if file is present
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400
    
    file = request.files['image']
    model_key = request.form.get('model', 'rgb')
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({
            'success': False, 
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    # Validate model selection
    if model_key not in MODEL_CONFIG:
        return jsonify({
            'success': False,
            'error': f'Invalid model. Choose from: {", ".join(MODEL_CONFIG.keys())}'
        }), 400
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Run prediction
        result = classifier.predict(filepath, model_key)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/classes', methods=['GET'])
def get_classes():
    """Return classification labels."""
    return jsonify({
        'success': True,
        'classes': CLASS_NAMES
    })


@app.route('/compare', methods=['POST'])
def compare():
    """Compare predictions from all models."""
    # Check if file is present
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({
            'success': False, 
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Run comparison on all models
        result = classifier.compare_all(filepath)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/heatmap', methods=['POST'])
def heatmap():
    """Generate Grad-CAM heatmap for model explainability."""
    # Check if file is present
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400
    
    file = request.files['image']
    model_key = request.form.get('model', 'rgb')
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({
            'success': False, 
            'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    # Validate model selection
    if model_key not in MODEL_CONFIG:
        return jsonify({
            'success': False,
            'error': f'Invalid model. Choose from: {", ".join(MODEL_CONFIG.keys())}'
        }), 400
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Generate heatmap
        result = classifier.generate_heatmap(filepath, model_key)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/analyze-series', methods=['POST'])
def analyze_series():
    """Analyze multiple images for time-series land change detection."""
    # Check if files are present
    if 'images' not in request.files:
        return jsonify({'success': False, 'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    model_key = request.form.get('model', 'rgb')
    dates = request.form.getlist('dates')  # Optional date labels
    
    if len(files) < 2:
        return jsonify({'success': False, 'error': 'At least 2 images required for time-series analysis'}), 400
    
    # Validate model selection
    if model_key not in MODEL_CONFIG:
        return jsonify({
            'success': False,
            'error': f'Invalid model. Choose from: {", ".join(MODEL_CONFIG.keys())}'
        }), 400
    
    try:
        results = []
        filepaths = []
        
        # Process each image
        for i, file in enumerate(files):
            if file.filename == '' or not allowed_file(file.filename):
                continue
                
            filename = secure_filename(f"series_{i}_{file.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            filepaths.append(filepath)
            
            # Run prediction
            result = classifier.predict(filepath, model_key)
            
            if result['success']:
                date_label = dates[i] if i < len(dates) and dates[i] else f"T{i+1}"
                results.append({
                    'index': i,
                    'date': date_label,
                    'predicted_class': result['predicted_class'],
                    'confidence': result['confidence'],
                    'probabilities': result['probabilities']
                })
        
        # Clean up files
        for fp in filepaths:
            if os.path.exists(fp):
                os.remove(fp)
        
        if len(results) < 2:
            return jsonify({'success': False, 'error': 'Could not process enough images'}), 400
        
        # Detect changes
        changes = []
        for i in range(1, len(results)):
            prev = results[i-1]
            curr = results[i]
            if prev['predicted_class'] != curr['predicted_class']:
                changes.append({
                    'from_date': prev['date'],
                    'to_date': curr['date'],
                    'from_class': prev['predicted_class'],
                    'to_class': curr['predicted_class'],
                    'from_confidence': prev['confidence'],
                    'to_confidence': curr['confidence']
                })
        
        # Build timeline data for chart
        timeline = {
            'dates': [r['date'] for r in results],
            'classes': [r['predicted_class'] for r in results],
            'confidences': [r['confidence'] for r in results]
        }
        
        return jsonify({
            'success': True,
            'results': results,
            'changes': changes,
            'timeline': timeline,
            'total_images': len(results),
            'change_count': len(changes),
            'model_used': MODEL_CONFIG[model_key]['name']
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*50)
    print("="*50)
    print("➤ Open http://127.0.0.1:5000 in your browser")
    print("="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)


