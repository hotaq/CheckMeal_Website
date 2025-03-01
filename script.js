// Constants
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/v5hbma3pufbpy';
const MAX_IMAGE_WIDTH = 500; // Reduced maximum width for resized images
const MAX_IMAGE_HEIGHT = 500; // Added maximum height constraint
const IMAGE_QUALITY = 0.5; // Reduced JPEG quality for smaller file size
const MAX_BASE64_LENGTH = 45000; // Maximum safe length for base64 string (under SheetDB's 50,000 limit)

// Meal time definitions (24-hour format)
const MEAL_TIMES = [
    { name: 'มื้อเช้า', start: '06:00', end: '10:00' },
    { name: 'มื้อกลางวัน', start: '11:30', end: '14:00' },
    { name: 'มื้อเย็น', start: '16:00', end: '18.00' }
];

// DOM Elements
const mealForm = document.getElementById('meal-form');
const nameInput = document.getElementById('name');
const photoInput = document.getElementById('meal-photo');
const imagePreview = document.getElementById('image-preview');
const historyContainer = document.getElementById('history-container');
const currentTimeDisplay = document.getElementById('current-time');
const currentMealDisplay = document.getElementById('current-meal');
const detectionFeedback = document.getElementById('detection-feedback');
const detectionMessage = document.getElementById('detection-message');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load history on page load
    loadHistory();
    
    // Image preview functionality
    photoInput.addEventListener('change', handleImagePreview);
    
    // Form submission
    mealForm.addEventListener('submit', handleFormSubmit);
    
    // Update current time and meal status immediately
    updateTimeAndMealStatus();
    
    // Update time every second for real-time clock
    setInterval(updateTimeAndMealStatus, 1000);
});

// Functions
function updateTimeAndMealStatus() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    // Thai time format
    const thaiTime = `${hours}:${minutes}:${seconds} น.`;
    
    // Update time display if element exists
    if (currentTimeDisplay) {
        currentTimeDisplay.textContent = thaiTime;
    }
    
    const currentMeal = getCurrentMeal();
    
    // Update meal status if element exists
    if (currentMealDisplay) {
        if (currentMeal) {
            currentMealDisplay.textContent = `ถึงเวลากินข้าววมื้อปัจจุบัน: ${currentMeal.name}`;
            currentMealDisplay.className = 'meal-time-active';
            
            // Enable the submit button
            document.getElementById('submit-btn').disabled = false;
        } else {
            currentMealDisplay.textContent = 'เลยยเวลากินข้าววละนะะกินยังง';
            currentMealDisplay.className = 'meal-time-inactive';
            
            // Disable the submit button outside meal times
            document.getElementById('submit-btn').disabled = true;
        }
    }
}

function getCurrentMeal() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Check if current time falls within any meal time
    for (const meal of MEAL_TIMES) {
        if (currentTimeString >= meal.start && currentTimeString <= meal.end) {
            return meal;
        }
    }
    
    // Not currently a meal time
    return null;
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            
            // Start food detection
            detectFoodInImage(file);
        };
        reader.readAsDataURL(file);
    }
}

// Function to detect food in the selected image and show feedback
async function detectFoodInImage(file) {
    try {
        // Show loading feedback
        detectionFeedback.className = 'detection-feedback detection-loading';
        detectionMessage.textContent = 'กำลังวิเคราะห์รูปภาพ...';
        detectionFeedback.style.display = 'block';
        
        // Perform food detection
        const result = await verifyFoodImageWithDetails(file);
        
        // Update feedback based on result
        if (result.isFood) {
            detectionFeedback.className = 'detection-feedback detection-success';
            
            if (result.dishes && result.dishes.length > 0) {
                // Show detected dishes if available
                const dishNames = result.dishes.map(dish => dish.name).join(', ');
                detectionMessage.textContent = `ตรวจพบอาหาร: ${dishNames} ✓`;
            } else {
                detectionMessage.textContent = 'ตรวจพบอาหารในรูปภาพ ✓';
            }
            
            // Enable submit button if it's meal time
            const currentMeal = getCurrentMeal();
            if (currentMeal) {
                document.getElementById('submit-btn').disabled = false;
            }
        } else {
            detectionFeedback.className = 'detection-feedback detection-error';
            detectionMessage.textContent = 'ไม่พบอาหารในรูปภาพ กรุณาอัปโหลดรูปภาพอาหารเท่านั้น';
            
            // Disable submit button if no food detected
            document.getElementById('submit-btn').disabled = true;
        }
        
        // Hide feedback after 5 seconds if it's successful
        if (result.isFood) {
            setTimeout(() => {
                detectionFeedback.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        console.error('Error in food detection:', error);
        
        // Show error feedback
        detectionFeedback.className = 'detection-feedback detection-error';
        detectionMessage.textContent = 'เกิดข้อผิดพลาดในการตรวจสอบรูปภาพ';
        
        // Hide feedback after 5 seconds
        setTimeout(() => {
            detectionFeedback.style.display = 'none';
        }, 5000);
    }
}

// Enhanced function to verify food image and return detailed results
async function verifyFoodImageWithDetails(file) {
    try {
        // LogMeal API is not accessible with the current API key, so we'll use local detection only
        console.log('Using local food detection method');
        const isFood = await localFoodDetection(file);
        
        // Create a generic dish entry if food is detected
        if (isFood) {
            return {
                isFood: true,
                dishes: [{
                    name: 'อาหาร (วิเคราะห์จากภาพ)',
                    confidence: 0.85
                }]
            };
        } else {
            return { isFood: false, dishes: [] };
        }
    } catch (error) {
        console.error('Error verifying food image:', error);
        return { isFood: false, dishes: [] };
    }
}

// Local food detection using basic image analysis
async function localFoodDetection(file) {
    try {
        // Create an image element from the file
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        // Wait for the image to load
        await new Promise(resolve => {
            img.onload = resolve;
        });
        
        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple color-based food detection heuristic
        // Many food items have vibrant colors and color variation
        let colorVariation = 0;
        let saturationSum = 0;
        let brightnessSum = 0;
        let pixelCount = 0;
        
        // For animal detection (like dogs)
        let brownPixels = 0;
        let grayPixels = 0;
        let blackPixels = 0;
        
        // For food detection
        let redPixels = 0;
        let greenPixels = 0;
        let yellowPixels = 0;
        let orangePixels = 0;
        
        // Edge detection (food often has more edges)
        let edgeCount = 0;
        let prevR = 0, prevG = 0, prevB = 0;
        
        // Sample pixels (analyze every 10th pixel to save processing time)
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate color variation
            const avg = (r + g + b) / 3;
            colorVariation += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
            
            // Calculate saturation (simple approximation)
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            saturationSum += saturation;
            
            // Calculate brightness
            const brightness = (r + g + b) / 3 / 255;
            brightnessSum += brightness;
            
            // Count brown pixels (common in dogs, animals)
            // Brown has higher R, medium G, low B
            if (r > 100 && r > g + 20 && g > b + 20) {
                brownPixels++;
            }
            
            // Count gray pixels (common in some animals)
            // Gray has similar R, G, B values
            if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) {
                grayPixels++;
            }
            
            // Count black pixels (common in some animals)
            if (r < 60 && g < 60 && b < 60) {
                blackPixels++;
            }
            
            // Count food-related colors
            // Red (tomatoes, meat, etc.)
            if (r > 150 && r > g * 1.5 && r > b * 1.5) {
                redPixels++;
            }
            
            // Green (vegetables, herbs)
            if (g > 100 && g > r * 1.2 && g > b * 1.2) {
                greenPixels++;
            }
            
            // Yellow (corn, pasta, etc.)
            if (r > 180 && g > 180 && b < 100) {
                yellowPixels++;
            }
            
            // Orange (carrots, sweet potatoes, etc.)
            if (r > 180 && g > 100 && g < 180 && b < 80) {
                orangePixels++;
            }
            
            // Simple edge detection
            if (i > 0 && Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB) > 100) {
                edgeCount++;
            }
            
            prevR = r;
            prevG = g;
            prevB = b;
            
            pixelCount++;
        }
        
        // Normalize values
        const avgColorVariation = colorVariation / pixelCount;
        const avgSaturation = saturationSum / pixelCount;
        const avgBrightness = brightnessSum / pixelCount;
        
        // Calculate percentages of animal-like colors
        const brownPercentage = brownPixels / pixelCount;
        const grayPercentage = grayPixels / pixelCount;
        const blackPercentage = blackPixels / pixelCount;
        
        // Calculate percentages of food-like colors
        const redPercentage = redPixels / pixelCount;
        const greenPercentage = greenPixels / pixelCount;
        const yellowPercentage = yellowPixels / pixelCount;
        const orangePercentage = orangePixels / pixelCount;
        const foodColorPercentage = redPercentage + greenPercentage + yellowPercentage + orangePercentage;
        
        // Calculate edge density
        const edgeDensity = edgeCount / pixelCount;
        
        console.log('Local detection - Color variation:', avgColorVariation, 
                    'Saturation:', avgSaturation, 
                    'Brightness:', avgBrightness,
                    'Brown %:', brownPercentage,
                    'Gray %:', grayPercentage,
                    'Black %:', blackPercentage,
                    'Food colors %:', foodColorPercentage,
                    'Edge density:', edgeDensity);
        
        // Animal detection heuristic
        // Many animals (especially dogs) have significant brown/gray/black areas
        const isLikelyAnimal = (brownPercentage > 0.3 || grayPercentage > 0.4 || blackPercentage > 0.3) && 
                               avgSaturation < 0.2;
        
        if (isLikelyAnimal) {
            console.log('Local detection: Likely an animal, not food');
            return false;
        }
        
        // Food detection heuristic - improved with multiple factors
        // 1. Color variation (food often has varied colors)
        // 2. Saturation (food often has vibrant colors)
        // 3. Food-specific colors (red, green, yellow, orange)
        // 4. Edge density (food often has more edges/textures)
        // 5. Brightness in a moderate range
        
        const isLikelyFood = 
            // High color variation and saturation
            (avgColorVariation > 25 && avgSaturation > 0.15) || 
            // Moderate color variation with good saturation and brightness
            (avgColorVariation > 20 && avgSaturation > 0.18 && avgBrightness > 0.3 && avgBrightness < 0.8) ||
            // Significant presence of food-like colors
            (foodColorPercentage > 0.2 && avgSaturation > 0.1) ||
            // High edge density (textured food)
            (edgeDensity > 0.05 && avgSaturation > 0.1);
        
        console.log('Local food detection result:', isLikelyFood ? 'Likely food' : 'Not likely food');
        
        // Be more strict about what we consider food
        return isLikelyFood;
    } catch (error) {
        console.error('Error in local food detection:', error);
        // If local detection fails, be conservative and don't assume it's food
        return false;
    }
}

function compressAndConvertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        // Create a FileReader to read the file
        const reader = new FileReader();
        
        reader.onload = function(event) {
            // Create an image element
            const img = new Image();
            
            img.onload = function() {
                // Initial compression attempt
                compressImage(img, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, IMAGE_QUALITY)
                    .then(compressedBase64 => {
                        // Check if the result is still too large
                        if (compressedBase64.length > MAX_BASE64_LENGTH) {
                            console.log("First compression not enough, trying with more aggressive settings");
                            // Try more aggressive compression if still too large
                            return compressImage(img, 300, 300, 0.3);
                        }
                        return compressedBase64;
                    })
                    .then(compressedBase64 => {
                        // If still too large, try even more aggressive compression
                        if (compressedBase64.length > MAX_BASE64_LENGTH) {
                            console.log("Second compression not enough, trying with most aggressive settings");
                            return compressImage(img, 200, 200, 0.2);
                        }
                        return compressedBase64;
                    })
                    .then(finalBase64 => {
                        // Log size for debugging
                        console.log(`Original size: ${Math.round(event.target.result.length / 1024)} KB`);
                        console.log(`Final compressed size: ${Math.round(finalBase64.length / 1024)} KB`);
                        console.log(`Character count: ${finalBase64.length} (limit: ${MAX_BASE64_LENGTH})`);
                        
                        if (finalBase64.length > MAX_BASE64_LENGTH) {
                            reject(new Error(`Image is still too large (${Math.round(finalBase64.length / 1024)} KB). Please use a smaller image.`));
                        } else {
                            resolve(finalBase64);
                        }
                    })
                    .catch(error => {
                        reject(error);
                    });
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            
            // Set the source of the image to the FileReader result
            img.src = event.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        // Read the file as a data URL
        reader.readAsDataURL(file);
    });
}

// Helper function to compress an image with given dimensions and quality
function compressImage(img, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        // Scale down based on both width and height constraints
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }
        
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; // White background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to base64 string
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // Log compression details
        console.log(`Compressed to ${width}x${height} at ${quality*100}% quality: ${Math.round(compressedBase64.length / 1024)} KB`);
        
        resolve(compressedBase64);
    });
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function submitToSheetDB(name, imageUrl, mealType, detectedDishes = []) {
    const timestamp = new Date().toISOString();
    const check = "✓"; // Checkmark for the Check column
    
    // Format detected dishes information
    const dishesInfo = detectedDishes.length > 0 
        ? detectedDishes.map(dish => `${dish.name} (${Math.round(dish.confidence * 100)}%)`).join(', ')
        : '';
    
    try {
        const response = await fetch(SHEETDB_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: [
                    {
                        'Time': timestamp,
                        'Meal name': name,
                        'meal photo': imageUrl,
                        'Check': check,
                        'Meal Type': mealType,
                        'Detected Dishes': dishesInfo
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error('Failed to submit data to SheetDB. The image might be too large.');
        }
        
        return response.json();
    } catch (error) {
        console.error('Error submitting to SheetDB:', error);
        throw error;
    }
}

async function loadHistory() {
    try {
        historyContainer.innerHTML = '<div class="loading">Loading history...</div>';
        
        const response = await fetch(SHEETDB_API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch history data');
        }
        
        const data = await response.json();
        displayHistory(data);
    } catch (error) {
        console.error('Error loading history:', error);
        historyContainer.innerHTML = '<div class="error">Error loading history. Please try again later.</div>';
    }
}

function displayHistory(entries) {
    if (!entries.length) {
        historyContainer.innerHTML = '<div class="no-history">No check-ins yet. Be the first!</div>';
        return;
    }
    
    // Sort entries by timestamp (newest first)
    const sortedEntries = [...entries].sort((a, b) => {
        return new Date(b['Time']) - new Date(a['Time']);
    });
    
    historyContainer.innerHTML = '';
    
    sortedEntries.forEach(entry => {
        const timestamp = entry['Time'];
        const name = entry['Meal name'];
        const imageUrl = entry['meal photo'];
        const check = entry['Check'];
        const mealType = entry['Meal Type'] || '';
        const detectedDishes = entry['Detected Dishes'] || '';
        
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleString();
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // Create HTML for history item
        let historyHTML = `
            <img class="history-image" src="${imageUrl}" alt="Meal by ${name}">
            <div class="history-details">
                <div class="history-name">${name} ${check || ''}</div>
                <div class="history-meal-type">${mealType}</div>`;
                
        // Add detected dishes if available
        if (detectedDishes) {
            historyHTML += `<div class="history-dishes">AI ตรวจพบ: ${detectedDishes}</div>`;
        }
        
        // Add date
        historyHTML += `<div class="history-date">${formattedDate}</div>
            </div>`;
            
        historyItem.innerHTML = historyHTML;
        
        historyContainer.appendChild(historyItem);
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const name = nameInput.value.trim();
    const file = photoInput.files[0];
    
    if (!name || !file) {
        alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return;
    }
    
    // Check if current time is a valid meal time
    const currentMeal = getCurrentMeal();
    if (!currentMeal) {
        alert('อนุญาตให้เช็คอินได้เฉพาะในช่วงเวลาอาหารเท่านั้น:\n' + 
              MEAL_TIMES.map(meal => `${meal.name}: ${meal.start} - ${meal.end}`).join('\n'));
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังประมวลผล...';
        
        // Verify food image
        const result = await verifyFoodImageWithDetails(file);
        
        if (!result.isFood) {
            alert('กรุณาอัปโหลดรูปภาพอาหารเท่านั้น');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }
        
        // Convert and compress image to base64
        const imageBase64 = await compressAndConvertImageToBase64(file);
        
        // Submit data to SheetDB
        await submitToSheetDB(name, imageBase64, currentMeal.name, result.dishes);
        
        // Reset form and reload history
        mealForm.reset();
        imagePreview.style.display = 'none';
        loadHistory();
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        
        alert('เช็คอินสำเร็จแล้ว!');
    } catch (error) {
        console.error('Error submitting check-in:', error);
        
        // Reset button
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'ส่งการเช็คอิน';
        
        alert('เกิดข้อผิดพลาดในการส่งการเช็คอิน: ' + error.message);
    }
}

// Load the Google Sheets API client library
function loadSheetsApi() {
    gapi.client.load('sheets', 'v4', listTags);
}

// Fetch data from the Google Sheet
function listTags() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Sheet1!A1:A10', // Adjust the range as needed
    }).then(function(response) {
        const range = response.result;
        if (range.values.length > 0) {
            const tagsContainer = document.querySelector('.tag-list .inner');
            tagsContainer.innerHTML = ''; // Clear existing tags
            range.values.forEach((row) => {
                const tag = document.createElement('div');
                tag.className = 'tag';
                tag.innerHTML = `<span>#</span> ${row[0]}`;
                tagsContainer.appendChild(tag);
            });
        } else {
            console.log('No data found.');
        }
    }, function(response) {
        console.error('Error: ' + response.result.error.message);
    });
}
