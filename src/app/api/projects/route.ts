import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { projectId } = await request.json();
    
    if (projectId) {
      const { error: createError } = await supabase
      .from('projects')
      .insert({project_id: projectId})
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating project:', createError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
    } 
    
    return NextResponse.json({ 
      success: true, 
      projectId
    });
  } catch (error) {
    console.error('Error handling project:', error);
    return NextResponse.json(
      { error: 'Failed to process project request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('project_id, created_at, updated_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve projects', projects: [] },
        { status: 500 }
      );
    }
    
    const formattedProjects = projects.map(project => ({
      id: project.project_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    }));
    
    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('Error retrieving projects:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve projects', projects: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { user_id } = await request.json(); 
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const { data: userProjects, error: projectsError } = await supabase
      .from('projects')
      .select('project_id')
      .eq('user_id', user_id);
    
    if (projectsError) {
      console.error('Error fetching user projects:', projectsError);
      return NextResponse.json(
        { error: 'Failed to fetch user projects' },
        { status: 500 }
      );
    }
    
    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map(project => project.project_id);
      
      const { error: promptsDeleteError } = await supabase
        .from('prompts')
        .delete()
        .in('project_id', projectIds);
      
      if (promptsDeleteError) {
        console.error('Error deleting project prompts:', promptsDeleteError);
      }
    }
    
    const { error: projectDeleteError } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', user_id);
    
    if (projectDeleteError) {
      console.error('Error deleting projects from database:', projectDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete projects from database' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Projects and associated data for user ${user_id} have been deleted`
    });
  } catch (error) {
    console.error('Error deleting projects:', error);
    return NextResponse.json(
      { error: 'Failed to delete projects' },
      { status: 500 }
    );
  }
} 