package xyz.intelliron.shoppinglistapp.activities;

import android.os.Bundle;
import android.text.InputType;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import xyz.intelliron.shoppinglistapp.R;
import xyz.intelliron.shoppinglistapp.handlers.routehandlers.AuthHandler;

public class LoginActivity extends AppCompatActivity {
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

        setContentView(R.layout.activity_login);

        // Allow the user to toggle password visibility
        CheckBox passwordToggle = findViewById(R.id.LoginPasswordToggle);
        EditText passwordInput = findViewById(R.id.LoginPasswordInput);

        passwordToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
            } else {
                passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            }
            passwordInput.setSelection(passwordInput.getText().length());
        });

        // Handle login button click
        findViewById(R.id.LoginButton).setOnClickListener(v -> {
            String username = ((EditText) findViewById(R.id.LoginUsernameInput)).getText().toString();
            String password = ((EditText) findViewById(R.id.LoginPasswordInput)).getText().toString();

            if (username.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please enter both username and password.", Toast.LENGTH_SHORT).show();
                return;
            }

            authHandler.login(this, username, password, (success, message) -> {
                if (success) {
                    // Login successful, redirect to HomeScreenActivity
                    startActivity(new android.content.Intent(this, HomeScreenActivity.class));
                    finish();
                } else {
                    // Login failed, show error message
                    Toast.makeText(this, "Login failed: " + message, Toast.LENGTH_SHORT).show();
                }
            });
        });

        // Handle register button click
        findViewById(R.id.RegisterButton).setOnClickListener(v -> {
            // Redirect to RegisterActivity
            startActivity(new android.content.Intent(this, RegisterActivity.class));
        });
    }
}