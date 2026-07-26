#!/bin/bash
# Script to add centralized authentication to all HTML files

# List of HTML files to update
files=(
    "admin_portal.html"
    "auth.html"
    "bmi.html"
    "bt.html"
    "caloriecalculator.html"
    "contact.html"
    "diet.html"
    "fbt.html"
    "ftlm.html"
    "ftlw.html"
    "index.html"
    "lmt.html"
    "men.html"
    "mentee_dashboard.html"
    "mentee_profile_view.html"
    "mentor_applications.html"
    "mentor_dashboard.html"
    "mentor_management.html"
    "mgt.html"
    "plans.html"
    "recipe_management.html"
    "reset_password.html"
    "services.html"
    "start.html"
    "Support.html"
    "update_profile.html"
    "user_management.html"
    "women.html"
    "workout.html"
)

# Standard auth scripts to include
auth_scripts='    <!-- Centralized Authentication System -->
    <script src="js/globalAuth.js"></script>
    <script src="js/authInit.js"></script>
    <script src="js/clientLogger.js"></script>'

echo "Adding centralized authentication to HTML files..."

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Check if globalAuth.js is already included
        if grep -q "globalAuth.js" "$file"; then
            echo "  - globalAuth.js already included in $file"
            
            # Add missing scripts if needed
            if ! grep -q "authInit.js" "$file"; then
                echo "  - Adding authInit.js to $file"
                sed -i '/globalAuth.js/a\    <script src="js/authInit.js"></script>' "$file"
            fi
            
            if ! grep -q "clientLogger.js" "$file"; then
                echo "  - Adding clientLogger.js to $file"
                sed -i '/authInit.js/a\    <script src="js/clientLogger.js"></script>' "$file"
            fi
        else
            # Find the first <script> tag and add auth scripts before it
            if grep -q "<script" "$file"; then
                echo "  - Adding all auth scripts to $file"
                sed -i '0,/<script/{s/<script.*/'"$auth_scripts"'\n&/}' "$file"
            else
                echo "  - No <script> tag found in $file, adding before </body>"
                sed -i 's|</body>|'"$auth_scripts"'\n</body>|' "$file"
            fi
        fi
    else
        echo "File $file not found, skipping..."
    fi
done

echo "Authentication setup complete!"
