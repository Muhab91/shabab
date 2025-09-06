Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        console.log('Starting critical values check...');

        // Check for critical CMJ test values (RSI Score < 1.5)
        const cmjResponse = await fetch(`${supabaseUrl}/rest/v1/cmj_tests?rsi_score=lt.1.5&select=*,players(first_name,last_name)`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (cmjResponse.ok) {
            const criticalCMJTests = await cmjResponse.json();
            
            for (const test of criticalCMJTests) {
                // Check if notification already sent for this test
                const existingNotificationResponse = await fetch(
                    `${supabaseUrl}/rest/v1/notifications?related_table=eq.cmj_tests&related_id=eq.${test.id}&notification_type=eq.critical_value`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (existingNotificationResponse.ok) {
                    const existingNotifications = await existingNotificationResponse.json();
                    
                    if (existingNotifications.length === 0) {
                        // Get all trainers and admins to notify
                        const staffResponse = await fetch(
                            `${supabaseUrl}/rest/v1/profiles?role=in.(admin,trainer)&select=user_id,full_name,role`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey
                                }
                            }
                        );

                        if (staffResponse.ok) {
                            const staff = await staffResponse.json();
                            
                            for (const staffMember of staff) {
                                await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        recipient_id: staffMember.user_id,
                                        notification_type: 'critical_value',
                                        title: 'Kritischer RSI-Score erkannt',
                                        message: `${test.players?.first_name} ${test.players?.last_name}: RSI-Score von ${test.rsi_score} liegt unter dem kritischen Wert von 1.5`,
                                        priority: 'high',
                                        action_required: true,
                                        related_table: 'cmj_tests',
                                        related_id: test.id,
                                        metadata: {
                                            player_name: `${test.players?.first_name} ${test.players?.last_name}`,
                                            rsi_score: test.rsi_score,
                                            test_date: test.test_date
                                        }
                                    })
                                });
                            }
                        }
                    }
                }
            }
        }

        // Check for high pain intensity in physio assessments (>= 8)
        const physioResponse = await fetch(`${supabaseUrl}/rest/v1/physio_assessments?pain_intensity=gte.8&select=*,players(first_name,last_name)`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (physioResponse.ok) {
            const highPainAssessments = await physioResponse.json();
            
            for (const assessment of highPainAssessments) {
                // Check if notification already sent
                const existingNotificationResponse = await fetch(
                    `${supabaseUrl}/rest/v1/notifications?related_table=eq.physio_assessments&related_id=eq.${assessment.id}&notification_type=eq.critical_value`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (existingNotificationResponse.ok) {
                    const existingNotifications = await existingNotificationResponse.json();
                    
                    if (existingNotifications.length === 0) {
                        // Get physiotherapists and admins
                        const staffResponse = await fetch(
                            `${supabaseUrl}/rest/v1/profiles?role=in.(admin,physiotherapist)&select=user_id,full_name,role`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey
                                }
                            }
                        );

                        if (staffResponse.ok) {
                            const staff = await staffResponse.json();
                            
                            for (const staffMember of staff) {
                                await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${serviceRoleKey}`,
                                        'apikey': serviceRoleKey,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        recipient_id: staffMember.user_id,
                                        notification_type: 'critical_value',
                                        title: 'Hohe Schmerzintensität gemeldet',
                                        message: `${assessment.players?.first_name} ${assessment.players?.last_name}: Schmerzintensität von ${assessment.pain_intensity}/10 erfordert Aufmerksamkeit`,
                                        priority: 'high',
                                        action_required: true,
                                        related_table: 'physio_assessments',
                                        related_id: assessment.id,
                                        metadata: {
                                            player_name: `${assessment.players?.first_name} ${assessment.players?.last_name}`,
                                            pain_intensity: assessment.pain_intensity,
                                            assessment_date: assessment.date_of_assessment
                                        }
                                    })
                                });
                            }
                        }
                    }
                }
            }
        }

        // Check for overdue appointments (24 hours past scheduled time)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const appointmentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/appointments?appointment_date=lt.${oneDayAgo}&status=eq.scheduled&select=*,players(first_name,last_name),profiles(full_name)`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (appointmentsResponse.ok) {
            const overdueAppointments = await appointmentsResponse.json();
            
            for (const appointment of overdueAppointments) {
                // Check if notification already sent
                const existingNotificationResponse = await fetch(
                    `${supabaseUrl}/rest/v1/notifications?related_table=eq.appointments&related_id=eq.${appointment.id}&notification_type=eq.appointment_overdue`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (existingNotificationResponse.ok) {
                    const existingNotifications = await existingNotificationResponse.json();
                    
                    if (existingNotifications.length === 0) {
                        // Notify the staff member and admins
                        const recipientIds = [appointment.staff_id];
                        
                        // Add admins
                        const adminResponse = await fetch(
                            `${supabaseUrl}/rest/v1/profiles?role=eq.admin&select=user_id`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey
                                }
                            }
                        );

                        if (adminResponse.ok) {
                            const admins = await adminResponse.json();
                            recipientIds.push(...admins.map(admin => admin.user_id));
                        }

                        for (const recipientId of [...new Set(recipientIds)]) {
                            await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    recipient_id: recipientId,
                                    notification_type: 'appointment_overdue',
                                    title: 'Überfälliger Termin',
                                    message: `Termin mit ${appointment.players?.first_name} ${appointment.players?.last_name} ist seit mehr als 24 Stunden überfällig`,
                                    priority: 'medium',
                                    action_required: true,
                                    related_table: 'appointments',
                                    related_id: appointment.id,
                                    metadata: {
                                        player_name: `${appointment.players?.first_name} ${appointment.players?.last_name}`,
                                        appointment_date: appointment.appointment_date,
                                        appointment_type: appointment.appointment_type
                                    }
                                })
                            });
                        }
                    }
                }
            }
        }

        console.log('Critical values check completed successfully');

        return new Response(JSON.stringify({
            success: true,
            message: 'Critical values monitoring completed',
            timestamp: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Critical values monitoring error:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'MONITORING_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});