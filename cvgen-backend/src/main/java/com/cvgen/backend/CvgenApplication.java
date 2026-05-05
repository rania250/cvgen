package com.cvgen.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée de l'application CVGen.
 * Monolithe modulaire Spring Boot.
 */
@SpringBootApplication
public class CvgenApplication {

    public static void main(String[] args) {
        SpringApplication.run(CvgenApplication.class, args);
    }
}
