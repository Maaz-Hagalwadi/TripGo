package com.tripgo.backend.config;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.Properties;

public class EnvConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();
        
        try {
            String envPath = Paths.get(".env").toAbsolutePath().toString();
            Properties props = new Properties();
            props.load(new FileInputStream(envPath));
            
            environment.getPropertySources().addFirst(new PropertiesPropertySource("env", props));
        } catch (IOException e) {
            // .env file not found, continue without it
        }
    }
}