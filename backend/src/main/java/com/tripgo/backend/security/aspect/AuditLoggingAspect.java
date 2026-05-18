package com.tripgo.backend.security.aspect;

import com.tripgo.backend.model.entities.AuditLog;
import com.tripgo.backend.repository.AuditLogRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditLoggingAspect {

    private final AuditLogRepository auditLogRepository;

    private static final Pattern UUID_PATTERN = Pattern.compile(
            "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            Pattern.CASE_INSENSITIVE
    );

    @Around("within(com.tripgo.backend.controller..*) && " +
            "(@annotation(org.springframework.web.bind.annotation.PostMapping)   || " +
            " @annotation(org.springframework.web.bind.annotation.PutMapping)    || " +
            " @annotation(org.springframework.web.bind.annotation.PatchMapping)  || " +
            " @annotation(org.springframework.web.bind.annotation.DeleteMapping))")
    public Object auditMutation(ProceedingJoinPoint pjp) throws Throwable {
        String actorEmail = "anonymous";
        String actorRole  = "NONE";

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails details) {
                actorEmail = details.getUsername();
                actorRole  = auth.getAuthorities().stream()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .findFirst().orElse("UNKNOWN");
            }
        } catch (Exception ignored) {}

        String requestUri = "";
        String ipAddress  = "";
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                requestUri = req.getRequestURI();
                ipAddress  = req.getHeader("X-Forwarded-For");
                if (ipAddress == null) ipAddress = req.getRemoteAddr();
            }
        } catch (Exception ignored) {}

        String controllerClass = pjp.getTarget().getClass().getSimpleName();
        String methodName      = pjp.getSignature().getName();
        String action          = deriveAction(methodName);
        String entityType      = deriveEntityType(controllerClass);
        String entityId        = extractEntityId(requestUri);

        String status    = "SUCCESS";
        Throwable thrown = null;

        try {
            return pjp.proceed();
        } catch (Throwable t) {
            status = "FAILED";
            thrown = t;
            throw t;
        } finally {
            try {
                auditLogRepository.save(AuditLog.builder()
                        .actorEmail(actorEmail)
                        .actorRole(actorRole)
                        .action(action)
                        .entityType(entityType)
                        .entityId(entityId)
                        .details(requestUri)
                        .ipAddress(ipAddress)
                        .status(status)
                        .build());
            } catch (Exception ignored) {}
        }
    }

    private String deriveAction(String methodName) {
        String m = methodName.toLowerCase();
        if (m.startsWith("approve"))    return "APPROVE";
        if (m.startsWith("reject"))     return "REJECT";
        if (m.startsWith("suspend"))    return "SUSPEND";
        if (m.startsWith("unsuspend") || m.startsWith("restore")) return "RESTORE";
        if (m.startsWith("create") || m.startsWith("add"))        return "CREATE";
        if (m.startsWith("update") || m.startsWith("edit"))       return "UPDATE";
        if (m.startsWith("delete") || m.startsWith("remove"))     return "DELETE";
        if (m.startsWith("toggle"))     return "TOGGLE";
        if (m.startsWith("assign"))     return "ASSIGN";
        if (m.startsWith("start"))      return "START";
        if (m.startsWith("complete"))   return "COMPLETE";
        if (m.startsWith("cancel"))     return "CANCEL";
        if (m.startsWith("save") || m.startsWith("post")) return "CREATE";
        return methodName.toUpperCase();
    }

    private String deriveEntityType(String className) {
        return className
                .replace("Admin", "")
                .replace("Controller", "")
                .replaceAll("([A-Z])", "_$1")
                .replaceAll("^_", "")
                .toUpperCase();
    }

    private String extractEntityId(String uri) {
        if (uri == null) return null;
        Matcher m = UUID_PATTERN.matcher(uri);
        return m.find() ? m.group() : null;
    }
}
