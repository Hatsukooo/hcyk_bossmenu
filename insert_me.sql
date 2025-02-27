CREATE TABLE IF NOT EXISTS `jobs_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_name` varchar(50) NOT NULL,
  `color` varchar(10) DEFAULT '#4a90e2',
  `description` text DEFAULT NULL,
  `max_members` int(11) DEFAULT 50,
  `hide_from_public` tinyint(1) DEFAULT 0,
  `logo_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_name` (`job_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `jobs_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_name` varchar(50) NOT NULL,
  `permission_name` varchar(50) NOT NULL,
  `allowed_grades` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_permission` (`job_name`, `permission_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `jobs_activity_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_name` varchar(50) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `actor_identifier` varchar(60) NOT NULL,
  `target_identifier` varchar(60) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_name` (`job_name`),
  KEY `actor_identifier` (`actor_identifier`),
  KEY `target_identifier` (`target_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;