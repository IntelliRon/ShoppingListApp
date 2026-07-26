package xyz.intelliron.shoppinglistapp.activities;

import android.os.Bundle;
import android.text.InputType;
import android.util.Patterns;
import android.widget.CheckBox;
import android.widget.EditText;

import androidx.appcompat.app.AppCompatActivity;

import xyz.intelliron.shoppinglistapp.R;
import xyz.intelliron.shoppinglistapp.handlers.routehandlers.AuthHandler;

public class RegisterActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize AuthHandler instance
        AuthHandler authHandler = AuthHandler.getInstance();

        if (authHandler.isUserLoggedIn(this)) {
            // User is already logged in, redirect to HomeScreenActivity
            startActivity(new android.content.Intent(this, HomeScreenActivity.class));
            finish();
            return;
        }

        // Remove the action bar
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        setContentView(R.layout.activity_register);

        // Allow the user to toggle password visibility
        CheckBox passwordToggle = findViewById(R.id.RegisterPasswordToggle);
        EditText passwordInput = findViewById(R.id.RegisterPasswordInput);

        passwordToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
            } else {
                passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            }
            passwordInput.setSelection(passwordInput.getText().length());
        });

        // Allow the user to toggle confirm password visibility
        CheckBox confirmPasswordToggle = findViewById(R.id.RegisterConfirmPasswordToggle);
        EditText confirmPasswordInput = findViewById(R.id.RegisterConfirmPasswordInput);

        confirmPasswordToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                confirmPasswordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
            } else {
                confirmPasswordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            }
            confirmPasswordInput.setSelection(confirmPasswordInput.getText().length());
        });

        // Handle register button click
        findViewById(R.id.RegisterButton).setOnClickListener(v -> {
            String username = ((android.widget.EditText) findViewById(R.id.RegisterUsernameInput)).getText().toString();
            String password = ((android.widget.EditText) findViewById(R.id.RegisterPasswordInput)).getText().toString();
            String confirmPassword = ((android.widget.EditText) findViewById(R.id.RegisterConfirmPasswordInput)).getText().toString();
            String email = ((android.widget.EditText) findViewById(R.id.RegisterEmailInput)).getText().toString();

            if (username.isEmpty() || password.isEmpty() || confirmPassword.isEmpty() || email.isEmpty()) {
                android.widget.Toast.makeText(this, "Please fill in all fields", android.widget.Toast.LENGTH_SHORT).show();
                return;
            }

            if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                android.widget.Toast.makeText(this, "Please enter a valid email address", android.widget.Toast.LENGTH_SHORT).show();
                return;
            }

            if (!password.equals(confirmPassword)) {
                android.widget.Toast.makeText(this, "Passwords do not match", android.widget.Toast.LENGTH_SHORT).show();
                return;
            }

            authHandler.register(this, username, email, password, (success, message) -> {
                if (success) {
                    // Registration successful, redirect to HomeScreenActivity
                    startActivity(new android.content.Intent(this, HomeScreenActivity.class));
                    finish();
                } else {
                    // Registration failed, show error message
                    android.widget.Toast.makeText(this, "Registration failed: " + message, android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        });

        // Handle login button click
        findViewById(R.id.LoginButton).setOnClickListener(v -> {
            // Redirect to LoginActivity
            startActivity(new android.content.Intent(this, LoginActivity.class));
        });
    }
}
